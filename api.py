from flask import Flask, jsonify, request

app = Flask(__name__)

import json
exceptions = json.load(open("data/exceptions.json"))

# Get all exceptions
@app.route("/exceptions", methods=["GET"])
def get_exceptions():
    return jsonify(exceptions)

# Get by status
@app.route("/exceptions/<status>", methods=["GET"])
def get_by_status(status):
    filtered = [e for e in exceptions if e["status"] == status]
    return jsonify(filtered)

# Get by id
@app.route("/exception/<id>", methods=["GET"])
def get_by_id(id):
    match = next((e for e in exceptions if e["id"] == id), None)
    return jsonify(match)

if __name__ == "__main__":
    app.run(port=5000, debug=True)