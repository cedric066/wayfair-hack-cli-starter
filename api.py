from flask import Flask, jsonify
import json

app = Flask(__name__)

exceptions = json.load(open("data/exceptions.json"))
drivers = json.load(open("data/drivers.json"))

# --- EXCEPTIONS ---

@app.route("/exceptions", methods=["GET"])
def get_exceptions():
    return jsonify(exceptions)

@app.route("/exceptions/<status>", methods=["GET"])
def get_by_status(status):
    filtered = [e for e in exceptions if e["status"] == status]
    return jsonify(filtered)

@app.route("/exception/<id>", methods=["GET"])
def get_by_id(id):
    match = next((e for e in exceptions if e["id"] == id), None)
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