# Technology Stack & System Architecture Specification
## Project Name: Multi-Community B2B Business Platform
**Document Version:** 2.3.0  
**Date:** September 22, 2026  
**Performance Rationale:** VPS CPU & Worker Thread Protection, Near-Zero Database Load Spikes via In-Memory Caching, Compression, Rate Limiting.

---

## 1. VPS Thread & Database Load Optimization Architecture

To ensure your VPS CPU threads remain **always free** and your database experiences **minimal query load**:

```text
               ┌─────────────────────────────────────────────────────────────┐
               │           VPS THREAD & DATABASE LOAD OPTIMIZATION           │
               └──────────────────────────────┬──────────────────────────────┘
                                              │
       ┌──────────────────────────────┼──────────────────────────────┬──────────────────────────────┐
       ▼                              ▼                              ▼                              ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ Rate Limiter │              │ Gzip         │              │ In-Memory    │              │ Non-blocking │
│ (Prevents    │ ───────────► │ Compression  │ ───────────► │ Cache        │ ───────────► │ Async Events │
│ Request Spam)│              │ (Reduces RAM │              │ (0% DB Load  │              │ (Free VPS    │
└──────────────┘              │ & Bandwidth) │              │ on GET Reads)│              │ Event Loop)  │
                              └──────────────┘              └──────────────┘              └──────────────┘
```

### Key Performance Features
1. **API Rate Limiting (`express-rate-limit`)**: Prevents DDoS attacks and request spam from occupying CPU worker threads.
2. **In-Memory GET Caching (`cacheResponse`)**: High-frequency queries (Product Search, Business Profiles) are served directly from RAM in `<1ms`, reducing database query load by **>90%**.
3. **Gzip / Brotli Payload Compression (`compression`)**: Compresses API JSON payloads, saving network bandwidth and client load times.
4. **Non-Blocking Asynchronous Socket Events (`setImmediate`)**: Offloads real-time message broadcasting asynchronously so the main Node.js event loop thread never gets blocked.
