from flask import Flask, jsonify
import json

app = Flask(__name__)

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

if __name__ == "__main__":
    app.run(port=5000, debug=True)
