from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime

app = Flask(__name__)

DB_NAME = "medicines.db"


# ---------------- DATABASE ----------------

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            time TEXT NOT NULL,
            frequency TEXT DEFAULT 'Daily',
            notes TEXT DEFAULT '',
            status TEXT DEFAULT 'Active',
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS adherence (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER,
            medicine_name TEXT NOT NULL,
            action TEXT NOT NULL,
            date_time TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# ---------------- HOME ----------------

@app.route("/")
def home():
    return render_template("index.html")


# ---------------- GET MEDICINES ----------------

@app.route("/api/medicines", methods=["GET"])
def get_medicines():

    conn = get_db()

    medicines = conn.execute("""
        SELECT * FROM medicines
        ORDER BY time ASC
    """).fetchall()

    conn.close()

    return jsonify([dict(row) for row in medicines])


# ---------------- ADD MEDICINE ----------------

@app.route("/api/medicines", methods=["POST"])
def add_medicine():

    data = request.get_json()

    name = data.get("name", "").strip()
    dosage = data.get("dosage", "").strip()
    time = data.get("time", "").strip()
    frequency = data.get("frequency", "Daily")
    notes = data.get("notes", "").strip()

    if not name or not dosage or not time:
        return jsonify({
            "success": False,
            "message": "Medicine name, dosage and time are required."
        }), 400

    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO medicines
        (name, dosage, time, frequency, notes, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'Active', ?)
    """, (
        name,
        dosage,
        time,
        frequency,
        notes,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()

    medicine_id = cursor.lastrowid

    conn.close()

    return jsonify({
        "success": True,
        "message": "Medicine added successfully.",
        "id": medicine_id
    })


# ---------------- DELETE MEDICINE ----------------

@app.route("/api/medicines/<int:medicine_id>", methods=["DELETE"])
def delete_medicine(medicine_id):

    conn = get_db()

    medicine = conn.execute(
        "SELECT * FROM medicines WHERE id = ?",
        (medicine_id,)
    ).fetchone()

    if medicine is None:
        conn.close()

        return jsonify({
            "success": False,
            "message": "Medicine not found."
        }), 404

    conn.execute(
        "DELETE FROM medicines WHERE id = ?",
        (medicine_id,)
    )

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Medicine deleted successfully."
    })


# ---------------- UPDATE MEDICINE ----------------

@app.route("/api/medicines/<int:medicine_id>", methods=["PUT"])
def update_medicine(medicine_id):

    data = request.get_json()

    name = data.get("name", "").strip()
    dosage = data.get("dosage", "").strip()
    time = data.get("time", "").strip()
    frequency = data.get("frequency", "Daily")
    notes = data.get("notes", "").strip()

    if not name or not dosage or not time:
        return jsonify({
            "success": False,
            "message": "Required fields are missing."
        }), 400

    conn = get_db()

    cursor = conn.execute("""
        UPDATE medicines
        SET name = ?,
            dosage = ?,
            time = ?,
            frequency = ?,
            notes = ?
        WHERE id = ?
    """, (
        name,
        dosage,
        time,
        frequency,
        notes,
        medicine_id
    ))

    conn.commit()

    if cursor.rowcount == 0:
        conn.close()

        return jsonify({
            "success": False,
            "message": "Medicine not found."
        }), 404

    conn.close()

    return jsonify({
        "success": True,
        "message": "Medicine updated successfully."
    })


# ---------------- ADHERENCE ----------------

@app.route("/api/adherence", methods=["POST"])
def add_adherence():

    data = request.get_json()

    medicine_id = data.get("medicine_id")
    medicine_name = data.get("medicine_name")
    action = data.get("action")

    if not medicine_name or not action:
        return jsonify({
            "success": False,
            "message": "Invalid adherence data."
        }), 400

    conn = get_db()

    conn.execute("""
        INSERT INTO adherence
        (medicine_id, medicine_name, action, date_time)
        VALUES (?, ?, ?, ?)
    """, (
        medicine_id,
        medicine_name,
        action,
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Adherence recorded."
    })


# ---------------- ADHERENCE HISTORY ----------------

@app.route("/api/adherence", methods=["GET"])
def get_adherence():

    conn = get_db()

    records = conn.execute("""
        SELECT * FROM adherence
        ORDER BY id DESC
    """).fetchall()

    conn.close()

    return jsonify([dict(row) for row in records])


# ---------------- ANALYTICS ----------------

@app.route("/api/analytics", methods=["GET"])
def analytics():

    conn = get_db()

    total_medicines = conn.execute(
        "SELECT COUNT(*) FROM medicines"
    ).fetchone()[0]

    active_medicines = conn.execute(
        "SELECT COUNT(*) FROM medicines WHERE status='Active'"
    ).fetchone()[0]

    taken = conn.execute(
        "SELECT COUNT(*) FROM adherence WHERE action='Taken'"
    ).fetchone()[0]

    missed = conn.execute(
        "SELECT COUNT(*) FROM adherence WHERE action='Missed'"
    ).fetchone()[0]

    total_logs = taken + missed

    if total_logs > 0:
        adherence_rate = round((taken / total_logs) * 100)
    else:
        adherence_rate = 0

    conn.close()

    return jsonify({
        "total_medicines": total_medicines,
        "active_medicines": active_medicines,
        "taken": taken,
        "missed": missed,
        "adherence_rate": adherence_rate
    })


# ---------------- RUN APP ----------------

if __name__ == "__main__":

    init_db()

    print("--------------------------------------")
    print("MediEase Pro Advanced Health Suite")
    print("Server running at:")
    print("http://127.0.0.1:5000")
    print("--------------------------------------")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )