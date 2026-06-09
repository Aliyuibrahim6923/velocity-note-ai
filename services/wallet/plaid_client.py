import os
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from dotenv import load_dotenv

load_dotenv()

PLAID_CLIENT_ID = os.getenv('PLAID_CLIENT_ID', 'dummy_id')
PLAID_SECRET = os.getenv('PLAID_SECRET', 'dummy_secret')
PLAID_ENV = os.getenv('PLAID_ENV', 'sandbox')

host = plaid.Environment.Sandbox
if PLAID_ENV == 'development':
    host = plaid.Environment.Development
elif PLAID_ENV == 'production':
    host = plaid.Environment.Production

configuration = plaid.Configuration(
    host=host,
    api_key={
        'clientId': PLAID_CLIENT_ID,
        'secret': PLAID_SECRET,
    }
)
api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)

def create_link_token():
    request = LinkTokenCreateRequest(
        products=[Products("transactions")],
        client_name="Velocity Note AI",
        country_codes=[CountryCode("US")],
        language='en',
        user=LinkTokenCreateRequestUser(client_user_id="user_good")
    )
    response = client.link_token_create(request)
    return response.to_dict()

def exchange_public_token(public_token: str):
    request = ItemPublicTokenExchangeRequest(public_token=public_token)
    response = client.item_public_token_exchange(request)
    return response.to_dict()

def get_accounts(access_token: str):
    request = AccountsGetRequest(access_token=access_token)
    response = client.accounts_get(request)
    return response.to_dict()

def sync_transactions(access_token: str, cursor: str = None):
    # Pass an empty string if cursor is None
    kwargs = {'access_token': access_token}
    if cursor is not None:
        kwargs['cursor'] = cursor
    request = TransactionsSyncRequest(**kwargs)
    response = client.transactions_sync(request)
    return response.to_dict()
