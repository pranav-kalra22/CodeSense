import os
import subprocess
import PyPDF2

def build_html():
    css = """
    @page {
        size: A4 portrait;
        margin: 12mm 14mm 12mm 14mm;
    }
    * {
        box-sizing: border-box;
    }
    body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        color: #1e293b;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 8.5pt;
        line-height: 1.42;
    }
    .page {
        page-break-after: always;
        break-after: page;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 270mm;
        max-height: 270mm;
        overflow: hidden;
    }
    .page:last-child {
        page-break-after: avoid;
        break-after: avoid;
    }
    .content {
        flex-grow: 1;
    }
    .page-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #cbd5e1;
        padding-top: 5px;
        margin-top: 6px;
        font-size: 7.8pt;
        color: #64748b;
    }
    .page-footer .title {
        font-weight: 600;
        color: #475569;
    }
    .page-footer .num {
        font-weight: 700;
        color: #0f172a;
    }

    /* Hero Banner */
    .hero-banner {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #1e1b4b 100%);
        color: #ffffff;
        padding: 18px 22px;
        border-radius: 10px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        border: 1px solid #334155;
    }
    .hero-title {
        font-size: 16pt;
        font-weight: 800;
        color: #38bdf8;
        margin: 0 0 4px 0;
        letter-spacing: -0.3px;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .hero-subtitle {
        font-size: 9.8pt;
        color: #cbd5e1;
        margin: 0 0 10px 0;
        font-weight: 400;
        line-height: 1.35;
    }
    .badge-pill {
        display: inline-block;
        background: linear-gradient(90deg, #2563eb, #06b6d4);
        color: #ffffff;
        padding: 3px 12px;
        border-radius: 9999px;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.3px;
    }

    /* Section Typography */
    .bullet-header {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        padding: 8px 12px;
        margin: 8px 0 10px 0;
        font-size: 9.2pt;
        font-weight: 700;
        color: #0f172a;
    }
    .section-tag {
        color: #2563eb;
        font-size: 8pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin-bottom: 2px;
    }
    .section-title {
        color: #0f172a;
        font-size: 12.5pt;
        font-weight: 800;
        letter-spacing: -0.2px;
        margin: 0 0 8px 0;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 4px;
    }
    h3 {
        font-size: 9.5pt;
        font-weight: 700;
        color: #1e293b;
        margin: 8px 0 4px 0;
    }
    p {
        margin: 0 0 6px 0;
        color: #334155;
    }
    ul, ol {
        margin: 0 0 6px 0;
        padding-left: 18px;
    }
    li {
        margin-bottom: 3px;
        color: #334155;
    }
    strong {
        color: #0f172a;
    }

    /* Visual Cards & Callouts */
    .analogy-box {
        background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-left: 4px solid #0284c7;
        padding: 8px 12px;
        border-radius: 6px;
        margin: 6px 0 8px 0;
        font-size: 8.2pt;
        color: #0369a1;
    }
    .analogy-title {
        font-weight: 800;
        color: #0c4a6e;
        margin-bottom: 2px;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .script-box {
        background: #1e1b4b;
        border: 1px solid #4338ca;
        border-left: 4px solid #818cf8;
        padding: 10px 14px;
        border-radius: 6px;
        margin: 8px 0;
        color: #e0e7ff;
        font-size: 8.2pt;
        line-height: 1.42;
    }
    .script-title {
        font-weight: 800;
        color: #38bdf8;
        margin-bottom: 4px;
        font-size: 8.8pt;
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .card-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 6px 0;
    }
    .info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
    }
    .info-card-header {
        font-weight: 700;
        font-size: 8.6pt;
        margin-bottom: 3px;
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .card-blue { border-left: 3.5px solid #3b82f6; }
    .card-purple { border-left: 3.5px solid #8b5cf6; }
    .card-emerald { border-left: 3.5px solid #10b981; }
    .card-amber { border-left: 3.5px solid #f59e0b; }
    .card-rose { border-left: 3.5px solid #f43f5e; }

    /* Tables */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0 8px 0;
        font-size: 7.8pt;
        line-height: 1.32;
    }
    th {
        background-color: #f1f5f9;
        color: #0f172a;
        font-weight: 700;
        text-align: left;
        padding: 5px 8px;
        border: 1px solid #cbd5e1;
    }
    td {
        padding: 4.5px 8px;
        border: 1px solid #cbd5e1;
        color: #334155;
        vertical-align: top;
    }
    tr:nth-child(even) td {
        background-color: #f8fafc;
    }

    /* Monospace */
    code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 7.6pt;
        background-color: #f1f5f9;
        color: #0f172a;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid #e2e8f0;
    }
    """

    pages = []

    def p(num, content):
        return f"""
        <div class="page" id="page-{num}">
            <div class="content">
                {content}
            </div>
            <div class="page-footer">
                <span class="title">Resume Prep CodeSense: Technical Bullet Explanations & Interview Defense Guide</span>
                <span class="num">Page {num} of 5</span>
            </div>
        </div>
        """

    # ---------------- PAGE 1 ----------------
    page1_content = """
    <div class="hero-banner">
        <div class="hero-title">🎯 Resume Prep: CodeSense AI</div>
        <div class="hero-subtitle">Comprehensive Technical Breakdown, Intuitive Analogies, Phrase-by-Phrase Deconstruction & Interview Scripts for Your Top 3 Resume Bullets</div>
        <div class="badge-pill">Master Interview Preparation Guide</div>
    </div>

    <div class="section-tag">MASTER RESUME BLOCK</div>
    <div class="section-title">The Complete 3-Bullet Resume Section</div>
    <div class="bullet-header" style="background:#f1f5f9; border-left: 4px solid #2563eb;">
        <strong>CodeSense AI – Autonomous Code Review & Codebase Intelligence Platform |</strong> <em>Go, Python, PyTorch, CodeBERT, ChromaDB, Redis, PostgreSQL, Docker</em> <strong>2026</strong><br><br>
        <span style="font-weight:normal; font-size:8.4pt; line-height:1.45; display:block;">
        • <strong>Architected an event-driven AI code review pipeline</strong> across Go and Python microservices, intercepting GitHub pull requests via webhooks, queuing jobs in Redis, and delivering automated inline feedback in <strong>~11 seconds</strong>.<br><br>
        • <strong>Engineered a hybrid RAG engine</strong> combining Tree-Sitter AST parsing across 4 languages with 768-dimensional CodeBERT embeddings in ChromaDB, fusing dense vector similarity with sparse BM25 retrieval via <strong>Reciprocal Rank Fusion ($k=60$)</strong> to enrich LLM prompts with codebase context.<br><br>
        • <strong>Built an automated diff-validation guard</strong> that verifies AI comments strictly target modified code, eliminating hallucinated line numbers and preventing GitHub API errors.
        </span>
    </div>

    <div class="section-tag">BULLET 1 DEEP DIVE</div>
    <div class="section-title">Bullet 1: The Event-Driven Backend Architecture</div>
    <div class="bullet-header">
        • Architected an event-driven AI code review pipeline across Go and Python microservices, intercepting GitHub pull requests via webhooks, queuing jobs in Redis, and delivering automated inline feedback in ~11 seconds.
    </div>

    <div class="analogy-box">
        <div class="analogy-title">💡 The 10-Second Mental Model: The Smart Restaurant Drive-Thru</div>
        Instead of a waiter constantly running outside every 5 seconds to check if cars have arrived (polling), a chime rings the exact millisecond a car drives up (<strong>Webhook</strong>), the order is slipped onto a carousel ticket queue so the kitchen doesn't get flooded (<strong>Redis Queue</strong>), and the food is cooked and handed out in 11 seconds (<strong>~11s Inline Review</strong>).
    </div>

    <h3>Phrase-by-Phrase Technical Breakdown</h3>
    <ul>
        <li><strong>"Architected an event-driven AI code review pipeline":</strong> The system doesn't poll GitHub in busy-wait loops. It stays completely idle until a developer clicks <em>Create Pull Request</em> on GitHub. That single event triggers an asynchronous chain of microservices.</li>
        <li><strong>"across Go and Python microservices":</strong> Explains workload alignment. Go handles high-concurrency network I/O, HMAC hashing, and queue polling in under 15MB RAM; Python handles PyTorch tensors and Tree-Sitter AST parsing.</li>
        <li><strong>"intercepting GitHub pull requests via webhooks":</strong> GitHub fires an HTTP POST to our Go endpoint (<code>/webhook/github</code>). Go verifies the cryptographic <code>X-Hub-Signature-256</code> header using constant-time comparison (<code>hmac.Equal</code>), rejecting forged requests.</li>
        <li><strong>"queuing jobs in Redis":</strong> Prevents server crashes during sudden traffic spikes. The Go gateway pushes the job payload to Redis List <code>review_jobs</code> via <code>LPUSH</code> and responds with HTTP 200 OK in ~45ms. A worker pulls jobs via <code>BRPOP</code> at its own pace.</li>
        <li><strong>"delivering automated inline feedback in ~11 seconds":</strong> Instead of a vague top-level comment, CodeSense attaches comments directly to the specific offending lines of code in GitHub.</li>
    </ul>
    """
    pages.append(p(1, page1_content))

    # ---------------- PAGE 2 ----------------
    page2_content = """
    <div class="section-tag">BULLET 1 (CONTINUED)</div>
    <div class="section-title">Stopwatch Latency Proof & Interview Script</div>

    <h3>The Stopwatch Breakdown: Defending the "~11 Seconds" Metric</h3>
    <p>When an interviewer asks <em>"How did you get 11 seconds?"</em>, give them this exact timing breakdown from our live benchmark on GitHub PR #1:</p>
    <table>
        <thead>
            <tr>
                <th>Pipeline Stage</th>
                <th>Underlying Technology</th>
                <th>Measured Latency</th>
                <th>What Happens Internally</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>1. Webhook Ingestion</strong></td>
                <td>Go 1.22 <code>crypto/hmac</code></td>
                <td><strong>~45 ms</strong></td>
                <td>Reads raw bytes, validates HMAC-SHA256, sets Redis <code>SetNX</code> idempotency lock, and returns HTTP 200 OK.</td>
            </tr>
            <tr>
                <td><strong>2. Queue & Diff Retrieval</strong></td>
                <td>Redis List + GitHub REST API</td>
                <td><strong>~310 ms</strong></td>
                <td>Go worker dequeues job via <code>BRPOP</code> and downloads unified diff without cloning the repo.</td>
            </tr>
            <tr>
                <td><strong>3. AST Parsing & Embeddings</strong></td>
                <td>Tree-Sitter + CodeBERT (CPU)</td>
                <td><strong>~1,820 ms</strong></td>
                <td>Extracts function boundaries across Python, Go, JS, and TS, and generates 768-dim <code>[CLS]</code> vectors.</td>
            </tr>
            <tr>
                <td><strong>4. Vector Search & RRF</strong></td>
                <td>ChromaDB HNSW + BM25</td>
                <td><strong>~65 ms</strong></td>
                <td>Traverses HNSW graph to find top-3 codebase functions; applies anisotropy calibration.</td>
            </tr>
            <tr>
                <td><strong>5. LLM Inference</strong></td>
                <td>Groq LPU (<code>gpt-oss-120b</code>)</td>
                <td><strong>~8,450 ms</strong></td>
                <td>Runs low-temperature (0.1) inference, outputting structured JSON array of review comments.</td>
            </tr>
            <tr>
                <td><strong>6. Line Guard & GitHub Post</strong></td>
                <td>Go Review Worker + Postgres</td>
                <td><strong>~710 ms</strong></td>
                <td>Validates comments against diff added lines, posts to GitHub PR via API, and commits to Postgres.</td>
            </tr>
            <tr style="background:#eff6ff; font-weight:700;">
                <td colspan="2"><strong>TOTAL MEASURED LATENCY</strong></td>
                <td><strong>~11.4 Seconds</strong></td>
                <td><strong>End-to-end webhook receipt to live GitHub inline comments.</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="script-box">
        <div class="script-title">🗣️ Exact Verbal Interview Script for Bullet 1:</div>
        <em>"When an engineer opens or updates a PR, GitHub dispatches an HMAC-SHA256 authenticated webhook to our Go gateway. We verify the cryptographic signature in constant time and set a distributed idempotency key in Redis with a 300-second TTL to eliminate duplicate reviews on network retries.<br><br>
        Instead of blocking the HTTP connection to run the LLM, the handler immediately pushes the job payload onto a Redis list using <code>LPUSH</code> and returns an HTTP 200 OK to GitHub in under 50 milliseconds. A dedicated Go worker daemon consumes from this queue using blocking pops (<code>BRPOP</code>), fetches the unified diff via GitHub's REST API, and dispatches to our Python intelligence engine.<br><br>
        From the moment the developer saves the pull request to the moment inline comments appear on GitHub diff lines, the entire pipeline completes in approximately 11 seconds."</em>
    </div>

    <h3>Why Interviewers Love This Bullet:</h3>
    <div class="card-grid">
        <div class="info-card card-blue">
            <div class="info-card-header" style="color:#1d4ed8;">Decoupled Microservice Architecture</div>
            <p>Shows you know how to build asynchronous, production-grade backends using message queues (Redis) rather than monolithic synchronous scripts that crash under load.</p>
        </div>
        <div class="info-card card-emerald">
            <div class="info-card-header" style="color:#047857;">Quantifiable Performance Signal</div>
            <p>Providing an exact "~11 seconds" benchmark tells the recruiter you actually measured, profiled, and benchmarked your system in reality.</p>
        </div>
    </div>
    """
    pages.append(p(2, page2_content))

    # ---------------- PAGE 3 ----------------
    page3_content = """
    <div class="section-tag">BULLET 2 DEEP DIVE</div>
    <div class="section-title">Bullet 2: The Hybrid RAG & Intelligence Engine</div>
    <div class="bullet-header">
        • Engineered a hybrid RAG engine combining Tree-Sitter AST parsing across 4 languages with 768-dimensional CodeBERT embeddings in ChromaDB, fusing dense vector similarity with sparse BM25 retrieval via Reciprocal Rank Fusion ($k=60$) to enrich LLM prompts with codebase context.
    </div>

    <div class="analogy-box">
        <div class="analogy-title">💡 The 10-Second Mental Model: The Open-Book Exam with Reference Examples</div>
        Instead of asking an AI to review a single new chapter in total isolation (where it has to guess how the book usually reads), our system searches your entire codebase library, finds 2 or 3 existing functions that do almost the exact same thing, and attaches them to the prompt as an answer key so the AI never hallucinates.
    </div>

    <h3>Phrase-by-Phrase Technical Breakdown</h3>
    <ul>
        <li><strong>"Tree-Sitter AST parsing across 4 languages":</strong> Code is not plain text. If you chunk by line count (e.g. 50 lines), you slice functions in half, cutting off variables and imports. Tree-Sitter parses concrete syntax trees across <strong>Python, Go, JavaScript, and TypeScript</strong>, extracting self-contained function nodes, parameter lists, and docstrings.</li>
        <li><strong>"768-dimensional CodeBERT embeddings in ChromaDB":</strong> Computers cannot compare words directly. Microsoft's <code>codebert-base</code> Transformer turns code into a vector of 768 numbers. ChromaDB stores these vectors in a multi-layer graph (HNSW) for sub-50ms nearest-neighbor lookups.</li>
        <li><strong>"fusing dense vector similarity with sparse BM25 retrieval":</strong>
            <ul>
                <li><strong>Dense Vector Search (CodeBERT):</strong> Understands <em>intent and synonyms</em> (knows that <code>delete_user</code> and <code>remove_account</code> mean the same thing), but misses exact variable names like <code>TIMEOUT_V2</code>.</li>
                <li><strong>Sparse Keyword Search (BM25):</strong> Finds <em>exact symbol and variable names</em>, but is blind to synonyms.</li>
                <li><strong>Hybrid Search:</strong> Combines both so the AI understands conceptual intent AND exact identifiers.</li>
            </ul>
        </li>
        <li><strong>"via Reciprocal Rank Fusion ($k=60$)":</strong> Vector search gives cosine scores (e.g. 0.91); BM25 gives keyword counts (e.g. 14.5). You cannot add them together! RRF solves this by combining their <em>rank positions</em> (1st, 2nd, 3rd) rather than raw scores:
            <p style="text-align:center; margin:4px 0; font-weight:700; color:#1e1b4b;">$$RRF(d) = \sum_{m \in \{\text{dense}, \text{sparse}\}} \frac{1}{60 + \text{rank}_m(d)}$$</p>
            The constant $k=60$ prevents an outlier ranked #1 in only one engine from unfairly dominating a document ranked high in both.</li>
        <li><strong>"to enrich LLM prompts with codebase context":</strong> Injects the retrieved functions into the prompt, grounding the LLM in your team's real patterns and preventing hallucinated API advice.</li>
    </ul>

    <div class="script-box">
        <div class="script-title">🗣️ Exact Verbal Interview Script for Bullet 2:</div>
        <em>"When a PR arrives, we don't just send raw diff lines to the LLM. First, we use Tree-Sitter to parse the code into an Abstract Syntax Tree across Python, Go, JS, and TS, allowing us to extract complete syntactic functions instead of arbitrary line chunks.<br><br>
        Next, we generate 768-dimensional vector embeddings using CodeBERT and store them in ChromaDB. But vector search alone often misses exact variable or type names, while keyword search misses semantic synonyms. To solve this, we implemented a hybrid search combining dense CodeBERT similarity with sparse BM25 keyword matching, merging them using Reciprocal Rank Fusion with a smoothing constant of $k=60$.<br><br>
        We then inject the top-ranked codebase functions directly into the LLM prompt. This grounds the review in the repository's real-world patterns and drastically reduces hallucinated comments."</em>
    </div>
    """
    pages.append(p(3, page3_content))

    # ---------------- PAGE 4 ----------------
    page4_content = """
    <div class="section-tag">BULLET 3 DEEP DIVE</div>
    <div class="section-title">Bullet 3: The Diff-Line Validation Guard & Reliability</div>
    <div class="bullet-header">
        • Built an automated diff-validation guard that verifies AI comments strictly target modified code, eliminating hallucinated line numbers and preventing GitHub API errors.
    </div>

    <div class="analogy-box">
        <div class="analogy-title">💡 The 10-Second Mental Model: The Clipboard Inspector</div>
        A teacher is grading your new homework page. The teacher gets confused and tries to write a correction on page 50 of the textbook, or on a paragraph written 3 years ago that was never changed! Your guard is an inspector with a clipboard checking: <em>"Did the student actually touch this line today? Yes? Approved. No? Throw the note in the trash."</em>
    </div>

    <h3>The Real Engineering Problem: Why This Guard Was Mandatory</h3>
    <p>When an LLM reviews a unified diff, it frequently gets confused by line numbers and hunk offsets:</p>
    <div class="card-grid">
        <div class="info-card card-rose">
            <div class="info-card-header" style="color:#e11d48;">What the LLM Tries to Do</div>
            <p>The LLM spots a bug and suggests a comment on <strong>Line 120</strong>, but the developer only modified lines <strong>40 to 45</strong> in this pull request.</p>
        </div>
        <div class="info-card card-amber">
            <div class="info-card-header" style="color:#d97706;">What GitHub Does If You Allow It</div>
            <p>GitHub's REST API enforces strict bounds. If you attempt to post a review comment on an unchanged line, GitHub immediately crashes the request with an <strong>HTTP 422 Unprocessable Entity</strong> error!</p>
        </div>
    </div>
    <p>Even worse, GitHub rejects the <strong>entire review batch</strong>—meaning 4 perfectly valid bug catches get thrown away just because 1 comment had a bad line number!</p>

    <h3>Phrase-by-Phrase Technical Breakdown</h3>
    <ul>
        <li><strong>"Built an automated diff-validation guard":</strong> A defensive filter written in our Go Review Worker (<code>worker.go</code>) that intercepts every suggestion from the LLM before calling GitHub's API.</li>
        <li><strong>"that verifies AI comments strictly target modified code":</strong> Parses the git diff hunk headers (e.g. <code>@@ -10,4 +10,6 @@</code>) and collects all line numbers with a <code>+</code> symbol into an in-memory hash set of valid added lines.</li>
        <li><strong>"eliminating hallucinated line numbers":</strong> LLMs are probabilistic language models, not deterministic compilers. They are notoriously bad at counting line offsets in raw diff text. This phrase proves you understand LLM limitations and engineered software guardrails to catch their mistakes.</li>
        <li><strong>"and preventing GitHub API errors":</strong> By discarding or remapping comments targeting unchanged code, CodeSense achieves <strong>100% GitHub API delivery reliability</strong>.</li>
    </ul>

    <div class="script-box">
        <div class="script-title">🗣️ Exact Verbal Interview Script for Bullet 3:</div>
        <em>"When an LLM reviews a unified diff, it frequently miscounts line offsets and attempts to place comments on unchanged lines outside the diff hunk.<br><br>
        GitHub's REST API enforces strict validation: if you submit an inline review comment targeting a line that wasn't modified in the pull request, GitHub rejects the entire review with an HTTP 422 Unprocessable Entity status code, causing the review job to fail.<br><br>
        To solve this, our Go worker parses the git diff hunk headers into a hash set of valid added line numbers before making the API call. We cross-reference each LLM comment against this set. Any suggestion that targets an unchanged or out-of-bounds line is safely pruned, ensuring that 100% of the comments delivered to GitHub are valid and actionable."</em>
    </div>
    """
    pages.append(p(4, page4_content))

    # ---------------- PAGE 5 ----------------
    page5_content = """
    <div class="section-tag">SUMMARY MATRIX & INTERVIEW TIPS</div>
    <div class="section-title">Quick-Reference Comparison & Golden Rules</div>

    <h3>The 3 Bullets at a Glance: What Each Proves to an Interviewer</h3>
    <table>
        <thead>
            <tr>
                <th>Bullet</th>
                <th>Core Technical Competency</th>
                <th>Underlying Tech Stack</th>
                <th>What the Interviewer Asks</th>
                <th>Key Defense Concept to Say</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Bullet 1: Pipeline & Latency</strong></td>
                <td>Asynchronous Systems Design & High-Concurrency I/O</td>
                <td>Go 1.22, Redis 7, Webhooks, HMAC-SHA256, Goroutines</td>
                <td><em>"How did you get ~11s and handle traffic spikes?"</em></td>
                <td>Redis queue decouples ingestion (~45ms) from processing; non-blocking goroutines.</td>
            </tr>
            <tr>
                <td><strong>Bullet 2: Hybrid RAG & Embeddings</strong></td>
                <td>Applied Information Retrieval & NLP / Vectors</td>
                <td>Tree-Sitter, CodeBERT (768-dim), ChromaDB, BM25, RRF</td>
                <td><em>"Why not just use vector search alone?"</em></td>
                <td>Dense search captures synonyms; sparse search captures exact symbols. RRF ($k=60$) fuses both.</td>
            </tr>
            <tr>
                <td><strong>Bullet 3: Diff Guard & Reliability</strong></td>
                <td>Defensive Programming & Zero-Trust AI Architecture</td>
                <td>Go diff parser, GitHub REST API, Hunk validation</td>
                <td><em>"What happens when the LLM hallucinates lines?"</em></td>
                <td>Parse hunk headers (<code>+</code> lines) into a hash set; discard invalid lines to prevent HTTP 422 errors.</td>
            </tr>
        </tbody>
    </table>

    <h3>Top 5 Golden Rules for Defending CodeSense in Interviews:</h3>
    <ol>
        <li><strong>Never say "We trained an AI model":</strong> You did <em>not</em> train or fine-tune CodeBERT. You used pre-trained <code>microsoft/codebert-base</code> out-of-the-box for zero-shot vector embeddings. Be technically honest—interviewers respect engineering integration over fake training claims.</li>
        <li><strong>Defend the Go vs. Python separation immediately:</strong> If asked <em>"Why use two languages?"</em>, state: <em>"Go gives us sub-15MB RAM containers and constant-time HMAC validation for webhooks; Python gives us PyTorch tensors and Tree-Sitter grammar bindings."</em></li>
        <li><strong>Know your 3 key numbers:</strong>
            <ul>
                <li><strong>11.4 Seconds:</strong> End-to-end turnaround latency on live PR #1.</li>
                <li><strong>768 Dimensions:</strong> CodeBERT layer-12 <code>[CLS]</code> vector output size.</li>
                <li><strong>k = 60:</strong> Reciprocal Rank Fusion smoothing constant.</li>
            </ul>
        </li>
        <li><strong>Acknowledge the BERT Anisotropy issue:</strong> If asked about embedding quality, mention how raw cosine similarities cluster above 0.75 and how your piecewise linear calibration curve in <code>search.py</code> restored a realistic 50%–99% spread.</li>
        <li><strong>Explain the Human Feedback Loop:</strong> Remind the interviewer that developer accept/reject votes are logged in PostgreSQL and injected as negative constraints into future prompts, making the bot smarter over time without fine-tuning.</li>
    </ol>

    <div class="analogy-box" style="margin-top:10px;">
        <div class="analogy-title">🏆 Final Mentorship Takeaway:</div>
        Your 3 resume bullets tell a complete, airtight story: <strong>Bullet 1</strong> proves you can architect fast, resilient distributed systems; <strong>Bullet 2</strong> proves you master modern hybrid RAG and vector semantics; and <strong>Bullet 3</strong> proves you know how to build defensive guardrails around AI in the real world. You are 100% prepared to defend this project.
    </div>
    """
    pages.append(p(5, page5_content))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Resume Prep CodeSense: Technical Bullet Explanations & Interview Defense Guide</title>
<style>
{css}
</style>
</head>
<body>
{''.join(pages)}
</body>
</html>"""
    return html

def main():
    print("Building Resume Prep HTML document...")
    html_content = build_html()
    html_file = os.path.abspath("Resume_Prep_CodeSense.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML written to {html_file}")

    pdf_file = os.path.abspath("Resume Prep CodeSense.pdf")
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    print("Compiling Resume Prep PDF using Microsoft Edge headless...")
    cmd = f'Start-Process -FilePath "{edge_path}" -ArgumentList "--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--print-to-pdf=`"{pdf_file}`"", "`"{html_file}`"" -Wait'
    subprocess.run(["powershell", "-Command", cmd], check=True)
    
    if os.path.exists(pdf_file):
        print(f"PDF successfully generated at {pdf_file}")
        reader = PyPDF2.PdfReader(pdf_file)
        num_pages = len(reader.pages)
        print(f"Total Page Count: {num_pages}")
    else:
        print("Error: PDF file was not created!")

if __name__ == "__main__":
    main()
