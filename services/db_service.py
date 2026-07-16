import uuid
from datetime import datetime, timezone
import firebase_admin
from firebase_admin import firestore

def get_db():
    return firestore.client()

# --- Users ---

def get_user_by_username(username):
    db = get_db()
    users = db.collection('users').where('username', '==', username).limit(1).get()
    if users:
        doc = users[0]
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def get_user_by_email(email):
    db = get_db()
    users = db.collection('users').where('email', '==', email).limit(1).get()
    if users:
        doc = users[0]
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def get_user_by_id(user_id):
    db = get_db()
    doc = db.collection('users').document(user_id).get()
    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        return data
    return None

def create_user(username, email, password_hash):
    db = get_db()
    data = {
        'username': username,
        'email': email,
        'password_hash': password_hash,
        'created_at': datetime.now(timezone.utc)
    }
    doc_ref = db.collection('users').document()
    doc_ref.set(data)
    data['id'] = doc_ref.id
    return data

def delete_user_account(user_id):
    db = get_db()
    # 1. Delete all receipts associated with this user
    receipts = db.collection('receipts').where('user_id', '==', user_id).get()
    for doc in receipts:
        doc.reference.delete()
        
    # 2. Delete the user document itself
    db.collection('users').document(user_id).delete()
    return True

# --- Receipts ---

def save_receipt(data, receipt_id=None):
    db = get_db()
    
    # Clean datetime objects for Firestore compatibility if needed, though Firestore SDK handles standard python datetimes
    if not receipt_id:
        doc_ref = db.collection('receipts').document()
        if 'created_at' not in data:
            data['created_at'] = datetime.now(timezone.utc)
        doc_ref.set(data)
        data['id'] = doc_ref.id
        return data
    else:
        doc_ref = db.collection('receipts').document(receipt_id)
        doc_ref.update(data)
        data['id'] = receipt_id
        return data

def get_receipt(receipt_id, user_id=None):
    db = get_db()
    doc = db.collection('receipts').document(receipt_id).get()
    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        if user_id and data.get('user_id') != user_id:
            return None
        return data
    return None

def get_user_receipts(user_id, category=None):
    db = get_db()
    query = db.collection('receipts').where('user_id', '==', user_id)
    
    if category and category != 'all':
        query = query.where('category', '==', category)
        
    docs = query.get()
    receipts = []
    for doc in docs:
        r = doc.to_dict()
        r['id'] = doc.id
        receipts.append(r)
        
    # Sort in memory since Firestore composite index requires manual creation
    receipts.sort(key=lambda x: x.get('date_time') or x.get('created_at', datetime.min.replace(tzinfo=timezone.utc)), reverse=True)
    return receipts

def delete_receipt(receipt_id, user_id=None):
    db = get_db()
    if user_id:
        doc = db.collection('receipts').document(receipt_id).get()
        if doc.exists and doc.to_dict().get('user_id') != user_id:
            return False
    db.collection('receipts').document(receipt_id).delete()
    return True

# --- Tasks ---

def create_task(task_id, filename, user_id=None):
    db = get_db()
    db.collection('tasks').document(task_id).set({
        'filename': filename,
        'user_id': user_id,
        'status': 'processing',
        'created_at': datetime.now(timezone.utc)
    })
    
def update_task(task_id, data):
    db = get_db()
    db.collection('tasks').document(task_id).update(data)
    
def get_task(task_id):
    db = get_db()
    doc = db.collection('tasks').document(task_id).get()
    if doc.exists:
        data = doc.to_dict()
        data['id'] = doc.id
        # Convert datetime for JSON serialization
        if isinstance(data.get('created_at'), datetime):
            data['created_at'] = data['created_at'].isoformat()
        return data
    return None
