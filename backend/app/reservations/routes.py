from fastapi import APIRouter

router = APIRouter()

@router.get("/reservations/test")
def test_reservations():
	return {"ok": True, "service": "reservations"}

