from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, create_engine, Session, select
import logging

# Disable logging to keep output clean
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

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
        
        # CASE 1: Pass string ID
        try:
            print("Test 1: Passing string ID")
            # This is the most likely culprit if bind_processor expects UUID
            stmt = select(MyModel).where(MyModel.dataset_id == str(ds_id))
            res = session.exec(stmt).first()
            print(f"Result 1: {res}")
        except Exception as e:
            print(f"Error 1: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            
        # CASE 2: Pass dictionary
        try:
            print("\nTest 2: Passing dictionary")
            stmt = select(MyModel).where(MyModel.dataset_id == {})
            res = session.exec(stmt).first()
            print(f"Result 2: {res}")
        except Exception as e:
            print(f"Error 2: {type(e).__name__}: {e}")

if __name__ == "__main__":
    repro()
