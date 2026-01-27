
import requests
import json

PRODUCT_ID = "9b2bb5c1-51fb-44aa-9c4e-9225a91b7c71"
TOKEN = "d570e2e2-a96c-4da6-a5b2-eefc30e92d9b"
PHONE_ID = "130267"
DESTINATION = "593994712899" # Sending to self for test

url = f"https://api.maytapi.com/api/{PRODUCT_ID}/{PHONE_ID}/sendMessage"
headers = {
    "x-maytapi-key": TOKEN,
    "Content-Type": "application/json"
}
payload = {
    "to_number": DESTINATION,
    "type": "text",
    "message": "Test successful from Python script!"
}

print(f"Sending message to {DESTINATION}...")
try:
    response = requests.post(url, headers=headers, json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
