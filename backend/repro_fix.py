from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, create_engine, Session, select
from pydantic import BaseModel
import logging

# Disable logging
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

class DashboardStateRequest(BaseModel):
    dataset_id: UUID

class MyModel(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    dataset_id: UUID = Field(index=True)

engine = create_engine("sqlite:///:memory:")
SQLModel.metadata.create_all(engine)

def repro():
    with Session(engine) as session:
        ds_id = uuid4()
        session.add(MyModel(dataset_id=ds_id))
        session.commit()
        
        # Simulating Pydantic request validation
        json_id = str(ds_id)
        print(f"Incoming JSON ID: {json_id} (type: {type(json_id)})")
        
        state = DashboardStateRequest(dataset_id=json_id)
        print(f"Validated state.dataset_id: {state.dataset_id} (type: {type(state.dataset_id)})")
        
        # CASE 3: Use coerced UUID object
        try:
            print("\nTest 3: Passing coerced UUID object")
            stmt = select(MyModel).where(MyModel.dataset_id == state.dataset_id)
            res = session.exec(stmt).first()
            print(f"Result 3: {res}")
            print("SUCCESS: No AttributeError")
        except Exception as e:
            print(f"Error 3: {type(e).__name__}: {e}")

if __name__ == "__main__":
    repro()
