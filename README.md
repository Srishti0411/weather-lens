# WeatherLens

AI-driven spatio-temporal tracking and downscaling of extreme weather
anomalies in medium-range forecasts. Built for Smart India Hackathon,
problem statement SIH26078.

**The problem:** extreme weather (cyclones, heatwaves) is hard to spot
and track inside huge, coarse global forecasts, and standard deep
learning models blur out the exact peaks (max wind, heaviest rain)
that matter most.

**Our approach, two stages:**
1. **Track** — a graph neural network finds and follows the anomaly
   across a 3–10 day forecast window, using an Extreme Forecast Index
   against 30 years of climatology.
2. **Downscale** — a physics-constrained diffusion model sharpens the
   flagged region from 25 km to 5 km resolution without smoothing away
   the extreme values.

Validated on Cyclone Amphan (May 2020) against real IBTrACS track data.

## Results

- **85%** detection rate, **53 km** mean track error (ERA5 truth)
- **100%** detection rate on real 3–10 day forecasts, error growing
  155 km → 365 km with lead time (expected, realistic degradation)
- **98.5%** peak-wind retention (diffusion) vs. **95.5%** (plain U-Net)
  vs. **88.9%** (bicubic baseline) — this is the headline number

Full evidence: [`results/`](./results), [`notebooks/`](./notebooks)

## Repo structure

- `notebooks/` — training pipeline + inference/validation notebooks 
- `results/` — validation JSON + charts from the runs above
- `weights/` — trained model weights 
- `data/` — dataset sources + reproduction notebook 
- `frontend/` — dashboard UI 
- `api/` — serving layer

## Live demo

Frontend: [weatherlens078.netlify.app](https://weatherlens078.netlify.app) 
