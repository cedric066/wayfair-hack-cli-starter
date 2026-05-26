from flask import Flask, jsonify, request
from datetime import datetime, timezone
import json
import os

app = Flask(__name__)

RESERVATIONS_PATH = "data/reservations.json"


def load_reservations():
    if not os.path.exists(RESERVATIONS_PATH):
        return []
    with open(RESERVATIONS_PATH) as f:
        return json.load(f)

def save_reservations(reservations):
    with open(RESERVATIONS_PATH, "w") as f:
        json.dump(reservations, f, indent=2)

deliveries = json.load(open("data/deliveries.json"))
drivers = json.load(open("data/drivers.json"))

# --- DELIVERIES ---

@app.route("/delivery", methods=["GET"])
def get_deliveries():
    return jsonify(deliveries)


@app.route("/delivery/status/<status>", methods=["GET"])
def get_by_status(status):
    filtered = [e for e in deliveries if e["status"] == status]
    return jsonify(filtered)


@app.route("/delivery/order/<order_id>", methods=["GET"])
def get_by_order_id(order_id):
    filtered = [e for e in deliveries if e["order_id"] == order_id]
    return jsonify(filtered)


@app.route("/delivery/<id>", methods=["GET"])
def get_by_id(id):
    match = next((e for e in deliveries if e["id"] == id), None)
    return jsonify(match)

# --- DRIVERS ---

@app.route("/drivers", methods=["GET"])
def get_drivers():
    return jsonify(drivers)

@app.route("/driver/<driver_id>", methods=["GET"])
def get_driver(driver_id):
    match = next((d for d in drivers if d["driver_id"] == driver_id), None)
    return jsonify(match)

@app.route("/drivers/available/<date>", methods=["GET"])
def get_available_drivers(date):
    available = [d for d in drivers if date in d["available_dates"] and d["active"]]
    return jsonify(available)

# --- RESERVATIONS ---

@app.route("/reservations", methods=["GET"])
def get_reservations():
    return jsonify(load_reservations())

@app.route("/reservations", methods=["POST"])
def create_reservation():
    body = request.get_json()
    reservations = load_reservations()

    next_num = 1
    if reservations:
        existing_nums = [int(r["reservation_id"].split("-")[1]) for r in reservations]
        next_num = max(existing_nums) + 1
    reservation_id = f"RES-{next_num:03d}"

    reservation = {
        "reservation_id": reservation_id,
        "order_id": body.get("order_id"),
        "driver_id": body.get("driver_id"),
        "new_delivery_date": body.get("new_delivery_date"),
        "notes": body.get("notes"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    reservations.append(reservation)
    save_reservations(reservations)

    return jsonify(reservation), 201

if __name__ == "__main__":
    app.run(port=5000, debug=True)
