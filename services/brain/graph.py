import os
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = None
try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
except Exception as e:
    print(f"Failed to connect to Neo4j: {e}")

def create_document_node(text: str, category: str):
    if not driver:
        return "neo4j-not-connected-mock-id"
    
    query = """
    CREATE (d:Document {text: $text, category: $category, created_at: datetime()})
    RETURN id(d) as node_id
    """
    try:
        with driver.session() as session:
            result = session.run(query, text=text, category=category)
            record = result.single()
            return record["node_id"] if record else None
    except Exception as e:
        print(f"Neo4j Query Error: {e}")
        return "neo4j-error-mock-id"
