from config import MONGO_URI, MONGO_DB_NAME

client = None
db = None


async def connect_db():
    """Initialize MongoDB connection. Falls back to in-memory mock if unavailable."""
    global client, db

    # Try real MongoDB first
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        test_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=3000)
        # Test connection
        await test_client.server_info()
        client = test_client
        db = client[MONGO_DB_NAME]
        print("[OK] Connected to MongoDB:", MONGO_DB_NAME)
        return
    except Exception as e:
        print(f"[WARN] MongoDB not available ({e})")

    # Fallback: in-memory mock (no install required)
    try:
        from mongomock_motor import AsyncMongoMockClient
        client = AsyncMongoMockClient()
        db = client[MONGO_DB_NAME]
        print("[OK] Using in-memory database (mongomock) - data will not persist")
        return
    except ImportError:
        pass

    # Last resort: minimal in-memory implementation
    print("[OK] Using minimal in-memory database - data will not persist")
    db = InMemoryDB()


async def close_db():
    """Close MongoDB connection."""
    global client
    if client and hasattr(client, 'close'):
        client.close()
        print("[INFO] Database connection closed")


def get_db():
    """Return database instance."""
    return db


# ── Minimal in-memory fallback ─────────────────────────
class InMemoryCollection:
    """Minimal MongoDB-like collection using a list."""

    def __init__(self):
        self._docs = []
        self._counter = 0

    async def insert_one(self, doc):
        from bson import ObjectId
        self._counter += 1
        doc_copy = dict(doc)
        if "_id" not in doc_copy:
            doc_copy["_id"] = ObjectId()
        self._docs.append(doc_copy)

        class Result:
            inserted_id = doc_copy["_id"]
        return Result()

    async def insert_many(self, docs):
        for d in docs:
            await self.insert_one(d)

    async def find_one(self, query=None):
        for doc in self._docs:
            if self._matches(doc, query or {}):
                return dict(doc)
        return None

    def find(self, query=None):
        results = [dict(d) for d in self._docs if self._matches(d, query or {})]
        return InMemoryCursor(results)

    async def count_documents(self, query=None):
        return len([d for d in self._docs if self._matches(d, query or {})])

    async def update_one(self, query, update):
        for doc in self._docs:
            if self._matches(doc, query):
                if "$set" in update:
                    doc.update(update["$set"])
                return
        return None

    async def delete_one(self, query):
        for i, doc in enumerate(self._docs):
            if self._matches(doc, query):
                self._docs.pop(i)
                return
        return None

    def _matches(self, doc, query):
        for key, val in query.items():
            if key == "$gte" or key == "$lte":
                continue
            doc_val = doc.get(key)
            if isinstance(val, dict):
                for op, op_val in val.items():
                    if op == "$gte" and doc_val < op_val:
                        return False
                    if op == "$lte" and doc_val > op_val:
                        return False
            elif doc_val != val:
                return False
        return True


class InMemoryCursor:
    def __init__(self, results):
        self._results = results
        self._sorted = False

    def sort(self, key, direction=-1):
        try:
            self._results.sort(key=lambda x: x.get(key, 0), reverse=(direction == -1))
        except TypeError:
            pass
        return self

    def skip(self, n):
        self._results = self._results[n:]
        return self

    def limit(self, n):
        self._results = self._results[:n]
        return self

    async def to_list(self, length=None):
        if length:
            return self._results[:length]
        return self._results


class InMemoryDB:
    """Minimal MongoDB-like database."""

    def __init__(self):
        self._collections = {}

    def __getattr__(self, name):
        if name.startswith("_"):
            return super().__getattribute__(name)
        if name not in self._collections:
            self._collections[name] = InMemoryCollection()
        return self._collections[name]
