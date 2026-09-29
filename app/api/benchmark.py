"""Benchmark endpoint."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import BenchmarkRequest

router = APIRouter(prefix="/api/benchmark", tags=["benchmark"])


@router.post("/run")
def run_benchmark(req: BenchmarkRequest):
    try:
        from benchmarks.run_benchmark import run_benchmark as _run_bm

        results = _run_bm(
            force_synthetic=req.force_synthetic,
            use_smote=req.use_smote,
            n_estimators=req.n_estimators,
            synthetic_rows=req.rows,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Benchmark configuration failed: {exc}")
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Benchmark failed: {exc}")
    return {"results": results}
