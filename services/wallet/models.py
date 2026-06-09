from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
import datetime

Base = declarative_base()

class PlaidItem(Base):
    __tablename__ = "plaid_items"
    
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(String, unique=True, index=True)
    access_token = Column(String, unique=True)
    cursor = Column(String, nullable=True) # Used for plaid sync
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    accounts = relationship("Account", back_populates="item")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(String, primary_key=True, index=True) # Plaid account_id
    item_id = Column(String, ForeignKey("plaid_items.item_id"))
    name = Column(String)
    mask = Column(String)
    type = Column(String)
    subtype = Column(String)
    balance_current = Column(Float, nullable=True)
    balance_available = Column(Float, nullable=True)
    
    item = relationship("PlaidItem", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True, index=True) # Plaid transaction_id
    account_id = Column(String, ForeignKey("accounts.id"))
    amount = Column(Float)
    date = Column(String) # YYYY-MM-DD
    name = Column(String)
    merchant_name = Column(String, nullable=True)
    pending = Column(Boolean, default=False)
    
    account = relationship("Account", back_populates="transactions")
