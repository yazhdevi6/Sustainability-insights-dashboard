# Architecture

## Components

```mermaid
flowchart LR
    U([Business user]) --> FE

    subgraph FE["Next.js frontend (client/)"]
        P1["Dashboard page<br/>KPIs · charts · supplier table"]
        P2["Supplier page<br/>metrics · history · AI insight panel"]
        PX["/api/* rewrite proxy"]
    end

    subgraph BE["Express API (server/)"]
        MW["Helmet · CORS · JSON limit<br/>Zod validation · rate limit"]
        R1["/api/dashboard"]
        R2["/api/suppliers"]
        RR["Review rules<br/>(deterministic)"]
        subgraph LLM["Insight pipeline"]
            C["Context builder<br/>(pre-computed metrics)"]
            PR["Prompt<br/>system + data"]
            PV{"Provider"}
            G["Gemini provider"]
            M["Mock provider"]
            V["Zod validation<br/>+ retry"]
        end
        EH["Central error handler"]
    end

    DB[("PostgreSQL<br/>suppliers · products · certifications<br/>metric_periods · insights")]
    GEM[["Google Gemini API"]]
    ENV[/"server/.env<br/>GEMINI_API_KEY · DATABASE_URL"/]

    P1 -- server-side fetch --> R1
    P2 -- server-side fetch --> R2
    P2 -- "POST insights (browser)" --> PX --> R2
    MW --> R1 & R2
    R1 & R2 --> RR
    R2 --> C --> PR --> PV
    PV -- key set --> G --> GEM
    PV -- no key --> M
    G & M --> V
    R1 & R2 & V <--> DB
    ENV -. read only by server .-> G
    R1 & R2 -.-> EH
```

**Key boundaries**

- The browser never calls Gemini and never sees the API key. It only talks to our own `/api`, which Next.js proxies to Express.
- The API key exists only in `server/.env`. It is loaded and validated in `server/src/config/env.ts`, and it isn't logged or returned by any endpoint.
- The "requires review" decision is made by plain code (`reviewRules.ts`). The LLM explains the decision; it doesn't make it.

## Insight request flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser (InsightPanel)
    participant N as Next.js proxy
    participant A as Express route
    participant S as insightService
    participant D as PostgreSQL
    participant G as Gemini

    B->>N: POST /api/suppliers/7/insights {forceRefresh:false}
    N->>A: forward
    A->>A: rate limit (10/min/IP) + Zod validate params & body
    A->>S: generateInsight(7)
    S->>D: load supplier + portfolio (metrics, certs, products)
    S->>S: build context (changes %, averages, rank, rule flags)<br/>hash context
    S->>D: find insight with same context hash
    alt cached and not forceRefresh
        D-->>S: cached insight
        S-->>A: {insight, cached:true}
    else generate
        S->>G: generateContent(system, data, JSON schema, temp 0.2, timeout)
        G-->>S: JSON text
        S->>S: parse + Zod validate (retry with backoff if invalid/transient)
        S->>S: enforce requiresReview = rules
        S->>D: INSERT insight
        S-->>A: {insight, cached:false}
    end
    A-->>B: 201/200 {data, meta}
    Note over A,B: Errors → central handler → {error:{code,message}}<br/>e.g. 504 LLM_TIMEOUT, 429 LLM_RATE_LIMITED
```

## Data model

```mermaid
erDiagram
    Supplier ||--o{ Product : supplies
    Supplier ||--o{ Certification : holds
    Supplier ||--o{ MetricPeriod : reports
    Supplier ||--o{ Insight : has
    Supplier { int id PK  string name  string country  string sector }
    Product { int id PK  string name  string category }
    Certification { int id PK  string name  string issuer  date issuedOn  date expiresOn }
    MetricPeriod { int id PK  string period  date periodStart  float emissionsTco2e  float energyMwh  float waterLitres  float recycledPct  float wasteRecoveryPct }
    Insight { int id PK  string summary  string riskLevel  bool requiresReview  json keyFindings  json recommendations  string provider  string model  string contextHash  int latencyMs }
```
