from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json

def schedule_event(title: str, start_time: str, end_time: str, description: str, google_token: str) -> bool:
    if not google_token:
        # For local MVP testing without real Google Sync, just return True
        print(f"[HANDS MOCK] Scheduled: {title} at {start_time}")
        return True
        
    try:
        creds = Credentials(token=google_token)
        service = build('calendar', 'v3', credentials=creds)

        event = {
          'summary': title,
          'description': description or '',
          'start': {
            'dateTime': start_time,
          },
          'end': {
            'dateTime': end_time,
          },
        }

        event = service.events().insert(calendarId='primary', body=event).execute()
        print('Event created: %s' % (event.get('htmlLink')))
        return True
    except Exception as e:
        print(f"Error scheduling event: {e}")
        return False
