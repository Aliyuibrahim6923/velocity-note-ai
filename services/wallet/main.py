from fastapi import FastAPI, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import init_db, get_db
import models
import plaid_client
from pydantic import BaseModel

app = FastAPI(title="Velocity Note AI Wallet Service")

@app.on_event("startup")
def on_startup():
    init_db()

class PublicTokenRequest(BaseModel):
    public_token: str

@app.post("/api/link/token/create")
def link_token_create():
    try:
        return plaid_client.create_link_token()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/link/token/exchange")
def link_token_exchange(req: PublicTokenRequest, db: Session = Depends(get_db)):
    try:
        exchange_res = plaid_client.exchange_public_token(req.public_token)
        access_token = exchange_res['access_token']
        item_id = exchange_res['item_id']
        
        # Save Item
        item = models.PlaidItem(item_id=item_id, access_token=access_token)
        db.add(item)
        
        # Fetch Accounts
        accounts_res = plaid_client.get_accounts(access_token)
        for acc in accounts_res.get('accounts', []):
            db_acc = models.Account(
                id=acc['account_id'],
                item_id=item_id,
                name=acc['name'],
                mask=acc.get('mask'),
                type=str(acc['type']),
                subtype=str(acc.get('subtype')),
                balance_current=acc.get('balances', {}).get('current'),
                balance_available=acc.get('balances', {}).get('available')
            )
            db.add(db_acc)
            
        db.commit()
        return {"status": "success", "item_id": item_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/webhooks/plaid")
async def plaid_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    webhook_type = payload.get('webhook_type')
    webhook_code = payload.get('webhook_code')
    item_id = payload.get('item_id')
    
    if webhook_type == 'TRANSACTIONS' and webhook_code == 'SYNC_UPDATES_AVAILABLE':
        item = db.query(models.PlaidItem).filter(models.PlaidItem.item_id == item_id).first()
        if not item:
            return {"status": "item not found"}
            
        try:
            sync_res = plaid_client.sync_transactions(item.access_token, item.cursor)
            added = sync_res.get('added', [])
            
            for txn in added:
                new_txn = models.Transaction(
                    id=txn['transaction_id'],
                    account_id=txn['account_id'],
                    amount=txn['amount'],
                    date=txn['date'],
                    name=txn['name'],
                    merchant_name=txn.get('merchant_name'),
                    pending=txn.get('pending', False)
                )
                db.merge(new_txn)
                
            item.cursor = sync_res.get('next_cursor')
            db.commit()
            print(f"Synced {len(added)} transactions for item {item_id}")
        except Exception as e:
            db.rollback()
            print(f"Webhook processing error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        
    return {"status": "processed"}

@app.get("/api/transactions")
def get_transactions(db: Session = Depends(get_db)):
    txns = db.query(models.Transaction).all()
    return txns
