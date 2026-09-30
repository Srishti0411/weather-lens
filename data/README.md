# Data

This project uses 5 datasets, all subset to the North Indian Ocean
region (0–35°N, 60–110°E) around Cyclone Amphan (May 2020). Raw data
isn't committed here (too large for GitHub) — see `download_data.ipynb`
to regenerate it, or the table below for direct sources.

| # | Dataset | Source | Variables | Used for |
|---|---|---|---|---|
| 1 | IFS HRES (0.25°) | WeatherBench 2 (GCP Zarr) | `msl`, `u10`, `v10` | Stage 1 input — coarse forecast stream to track the storm centroid. Init 13–15 May 2020 (00/12 UTC), 3–10 day leads |
| 2 | ERA5 Baseline (0.25°, 6-hourly) | WeatherBench 2 (GCP Zarr) | `msl`, `u10`, `v10` | Stage 1 baseline — 30-yr mean/std per grid node for standardized anomaly detection (EFI). May 1–31, 1991–2020, 00/06/12/18 UTC |
| 3 | ERA5 Surface (0.25°, hourly) | Copernicus CDS API | `tp`, `t2m`, `d2m`, `msl`, `u10`, `v10`, `sp`, `vimd` | Stage 2 ground truth — fine-tunes the diffusion model. Train: May/Nov 2015–2019. Test: 13–25 May 2020 |
| 4 | IBTrACS v04r01 | NOAA NCEI | `ISO_TIME`, `LAT`, `LON`, `WMO_WIND`, `WMO_PRES` | Validation — Amphan's real track, to measure GNN tracking error |
| 5 | IMERG Final 0.1° V07 (optional) | NASA GES DISC | `precipitation` | Evaluation only — checks peak rainfall wasn't blurred; not currently wired into the pipeline |

## Reproducing this data

`download_data.ipynb` downloads all 5 datasets to Google Drive. Run it
in Colab, with your own credentials:
- **Cell 4** needs a [CDS API key](https://cds.climate.copernicus.eu/profile) (dataset 3)
- **Cell 7** needs [NASA Earthdata](https://urs.earthdata.nasa.gov/) login (dataset 5, optional)

Datasets 1, 2, and 4 need no credentials. Expect ~10 GB total and
20–40 minutes to run, mostly for dataset 2's 30-year climatology.