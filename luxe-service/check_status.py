
import requests
import json

PRODUCT_ID = "9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71"
TOKEN = "d570e2e2-a96c-4da6-a5b2-eefc30e92d9b"
PHONE_ID = "130267"

url = f"https://api.maytapi.com/api/{PRODUCT_ID}/{PHONE_ID}/status"
headers = {
    "x-maytapi-key": TOKEN
}

print(f"Checking status for Phone ID: {PHONE_ID}...")
try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
