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
        font-size: 8.6pt;
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
        background: linear-gradient(135deg, #1e1b4b 0%, #1e293b 50%, #0f172a 100%);
        color: #ffffff;
        padding: 18px 22px;
        border-radius: 10px;
        margin-bottom: 12px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        border: 1px solid #312e81;
    }
    .hero-title {
        font-size: 16pt;
        font-weight: 800;
        color: #38bdf8;
        margin: 0 0 5px 0;
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
        background: linear-gradient(90deg, #4f46e5, #06b6d4);
        color: #ffffff;
        padding: 3px 12px;
        border-radius: 9999px;
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 0.3px;
    }

    /* Section Headers */
    .chapter-tag {
        display: inline-block;
        color: #4f46e5;
        font-size: 8pt;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 2px;
    }
    .section-title {
        color: #0f172a;
        font-size: 13pt;
        font-weight: 800;
        letter-spacing: -0.3px;
        margin: 0 0 8px 0;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 4px;
    }
    h3 {
        font-size: 9.8pt;
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
    .card-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin: 8px 0;
    }
    .card-grid-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 8px;
        margin: 8px 0;
    }
    .info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 12px;
    }
    .info-card-header {
        font-weight: 700;
        font-size: 9pt;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .card-blue { border-left: 4px solid #3b82f6; }
    .card-purple { border-left: 4px solid #8b5cf6; }
    .card-emerald { border-left: 4px solid #10b981; }
    .card-amber { border-left: 4px solid #f59e0b; }
    .card-rose { border-left: 4px solid #f43f5e; }

    .analogy-box {
        background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%);
        border: 1px solid #bae6fd;
        border-left: 4px solid #0284c7;
        padding: 8px 12px;
        border-radius: 6px;
        margin: 8px 0;
        font-size: 8.3pt;
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

    /* Flow Boxes & Steps */
    .step-box {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-bottom: 8px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 8px 10px;
    }
    .step-num {
        background: #4f46e5;
        color: #ffffff;
        font-weight: 800;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8pt;
        flex-shrink: 0;
    }
    .step-content {
        flex-grow: 1;
    }
    .step-title {
        font-weight: 700;
        font-size: 8.8pt;
        color: #0f172a;
        margin-bottom: 2px;
    }

    /* Tables */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 6px 0 8px 0;
        font-size: 7.8pt;
        line-height: 1.35;
    }
    th {
        background-color: #f1f5f9;
        color: #0f172a;
        font-weight: 700;
        text-align: left;
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
    }
    td {
        padding: 5px 8px;
        border: 1px solid #cbd5e1;
        color: #334155;
        vertical-align: top;
    }
    tr:nth-child(even) td {
        background-color: #f8fafc;
    }

    /* Code boxes */
    pre, .code-snippet {
        background-color: #0f172a;
        color: #e2e8f0;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 7.4pt;
        line-height: 1.35;
        padding: 8px 10px;
        border-radius: 6px;
        margin: 6px 0;
        border: 1px solid #1e293b;
        white-space: pre-wrap;
    }
    code {
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 7.8pt;
        background-color: #f1f5f9;
        color: #0f172a;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid #e2e8f0;
    }

    /* Diagram Containers */
    .diagram-container {
        margin: 8px 0;
        display: flex;
        justify-content: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px;
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
                <span class="title">CodeSense: The Beginner's Illustrated Guide to LLMs, RAG & Autonomous Code Review</span>
                <span class="num">Page {num} of 9</span>
            </div>
        </div>
        """

    # ---------------- PAGE 1 ----------------
    page1_content = """
    <div class="hero-banner">
        <div class="hero-title">🚀 CodeSense: The Beginner's Visual Guide</div>
        <div class="hero-subtitle">Mastering Large Language Models (LLMs), Retrieval-Augmented Generation (RAG), and Autonomous AI Code Reviews from Absolute Scratch</div>
        <div class="badge-pill">Beginner to Junior Engineer Companion Guide</div>
    </div>

    <div class="chapter-tag">CHAPTER 1</div>
    <div class="section-title">What is an LLM and Why Does it Need Help?</div>

    <p>If you're new to Artificial Intelligence, you've probably heard of <strong>LLMs (Large Language Models)</strong> like ChatGPT, Claude, or LLaMA. At their core, LLMs are gigantic statistical pattern matchers. Having read billions of sentences and code files on the internet, they are incredible at predicting what word or code snippet should come next.</p>

    <div class="analogy-box">
        <div class="analogy-title">💡 The Intuitive Analogy: The Brilliant Student Taking a Closed-Book Exam</div>
        Imagine a student with a photographic memory who has read every public book in the world library. If you ask them a general question about Python, they can recite an answer in seconds. But what happens if you ask them about the private rules of <em>your</em> company's software? They have never seen it! They will either give you generic advice or invent confident-sounding guesses (hallucinations).
    </div>

    <h3>The 3 Fatal Flaws of Pure LLMs in Software Engineering</h3>
    <div class="card-grid-3">
        <div class="info-card card-rose">
            <div class="info-card-header" style="color: #e11d48;">1. Memory Limits (Context)</div>
            <p>An LLM can only read a certain number of words at once (called its <strong>Context Window</strong>). A real software project has hundreds of thousands of lines of code. You simply cannot feed an entire project into an LLM on every pull request without crashing servers or paying fortune.</p>
        </div>
        <div class="info-card card-amber">
            <div class="info-card-header" style="color: #d97706;">2. Hallucinations</div>
            <p>LLMs want to please you. If they don't know the exact function name or database schema in your repo, they often <em>make up plausible-sounding functions</em> that don't actually exist in your codebase, giving developers bogus code advice.</p>
        </div>
        <div class="info-card card-purple">
            <div class="info-card-header" style="color: #7c3aed;">3. Private Codebase Blindness</div>
            <p>Public foundation models were trained on public GitHub repositories up to a cutoff date. They have zero knowledge of your private security rules, your team's naming conventions, or the helper utilities your teammates wrote yesterday.</p>
        </div>
    </div>

    <h3>Comparison: Closed-Book LLM vs. Open-Book System</h3>
    <div class="diagram-container">
        <svg width="520" height="110" viewBox="0 0 520 110" xmlns="http://www.w3.org/2000/svg">
            <!-- Box 1: Pure LLM -->
            <rect x="10" y="10" width="230" height="90" rx="8" fill="#fee2e2" stroke="#f87171" stroke-width="1.5"/>
            <text x="25" y="32" font-family="sans-serif" font-weight="700" font-size="11" fill="#991b1b">Pure LLM (Closed Book)</text>
            <text x="25" y="52" font-family="sans-serif" font-size="9" fill="#7f1d1d">• Guesses answers from memory alone</text>
            <text x="25" y="68" font-family="sans-serif" font-size="9" fill="#7f1d1d">• Hallucinates non-existent functions</text>
            <text x="25" y="84" font-family="sans-serif" font-size="9" fill="#7f1d1d">• Has zero knowledge of your codebase</text>

            <!-- Box 2: CodeSense RAG -->
            <rect x="280" y="10" width="230" height="90" rx="8" fill="#ecfdf5" stroke="#34d399" stroke-width="1.5"/>
            <text x="295" y="32" font-family="sans-serif" font-weight="700" font-size="11" fill="#065f46">CodeSense RAG (Open Book)</text>
            <text x="295" y="52" font-family="sans-serif" font-size="9" fill="#047857">• Searches codebase for exact similar files</text>
            <text x="295" y="68" font-family="sans-serif" font-size="9" fill="#047857">• Hands exact context to LLM</text>
            <text x="295" y="84" font-family="sans-serif" font-size="9" fill="#047857">• Accurate, grounded, zero-hallucination</text>

            <!-- Center Arrow -->
            <path d="M 245 55 L 275 55" stroke="#64748b" stroke-width="2" marker-end="url(#arrow)"/>
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
                </marker>
            </defs>
        </svg>
    </div>
    """
    pages.append(p(1, page1_content))

    # ---------------- PAGE 2 ----------------
    page2_content = """
    <div class="chapter-tag">CHAPTER 2</div>
    <div class="section-title">Demystifying RAG: Retrieval-Augmented Generation</div>

    <p>To solve the problems of memory limits, high costs, and hallucinations, modern AI systems use a technique called <strong>RAG (Retrieval-Augmented Generation)</strong>. Despite the fancy academic name, the concept is wonderfully simple!</p>

    <div class="analogy-box">
        <div class="analogy-title">💡 The Real-World Analogy: The Open-Book Exam with an Expert Research Assistant</div>
        Instead of forcing a doctor to memorize 10,000 medical textbooks, you give the doctor a super-fast research assistant. When a patient arrives with symptoms, the assistant runs to the library, pulls the exact 2 pages describing that condition, and hands them to the doctor. The doctor reads those 2 pages and makes a perfect diagnosis in seconds.
    </div>

    <h3>The 3 Essential Steps of RAG in CodeSense</h3>
    <div class="step-box">
        <div class="step-num">1</div>
        <div class="step-content">
            <div class="step-title">RETRIEVE (Search & Locate)</div>
            <p>When a developer submits a code change (Pull Request), CodeSense does NOT call the LLM immediately. First, it searches our vector database (ChromaDB) to find 2 or 3 existing functions in the codebase that look or act just like the new code.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">2</div>
        <div class="step-content">
            <div class="step-title">AUGMENT (Assemble the Cheat Sheet)</div>
            <p>CodeSense takes the developer's changed code, attaches the 2 or 3 matching codebase functions as reference examples, adds past developer feedback rules, and wraps them into a single clean instruction packet (the prompt).</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">3</div>
        <div class="step-content">
            <div class="step-title">GENERATE (Analyze & Review)</div>
            <p>Now, the LLM receives both the student's homework AND the teacher's reference answer key. It can spot security bugs, missing error handling, and style violations with near-zero hallucination!</p>
        </div>
    </div>

    <h3>Visual Diagram of the RAG Architecture</h3>
    <div class="diagram-container">
        <svg width="520" height="115" viewBox="0 0 520 115" xmlns="http://www.w3.org/2000/svg">
            <!-- User Code Change -->
            <rect x="10" y="25" width="110" height="65" rx="6" fill="#eff6ff" stroke="#3b82f6" stroke-width="1.5"/>
            <text x="20" y="48" font-family="sans-serif" font-weight="700" font-size="9.5" fill="#1e40af">New PR Diff</text>
            <text x="20" y="66" font-family="sans-serif" font-size="8" fill="#3b82f6">(Changed Code)</text>

            <path d="M 125 57 L 160 57" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr2)"/>

            <!-- Vector Search -->
            <rect x="165" y="15" width="130" height="85" rx="6" fill="#fdf4ff" stroke="#c084fc" stroke-width="1.5"/>
            <text x="175" y="38" font-family="sans-serif" font-weight="700" font-size="9.5" fill="#6b21a8">1. Vector Search</text>
            <text x="175" y="56" font-family="sans-serif" font-size="8" fill="#7e22ce">ChromaDB indexes</text>
            <text x="175" y="70" font-family="sans-serif" font-size="8" fill="#7e22ce">Codebase functions</text>
            <text x="175" y="85" font-family="sans-serif" font-weight="600" font-size="7.5" fill="#9333ea">Finds Top-3 Matches</text>

            <path d="M 300 57 L 335 57" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr2)"/>

            <!-- Prompt Augmenter -->
            <rect x="340" y="25" width="80" height="65" rx="6" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.5"/>
            <text x="346" y="48" font-family="sans-serif" font-weight="700" font-size="9" fill="#92400e">2. Augment</text>
            <text x="346" y="64" font-family="sans-serif" font-size="7.5" fill="#b45309">Diff + Matches</text>
            <text x="346" y="78" font-family="sans-serif" font-size="7.5" fill="#b45309">+ Rules</text>

            <path d="M 425 57 L 445 57" stroke="#64748b" stroke-width="1.5" marker-end="url(#arr2)"/>

            <!-- LLM Engine -->
            <rect x="450" y="25" width="65" height="65" rx="6" fill="#ecfdf5" stroke="#10b981" stroke-width="1.5"/>
            <text x="456" y="48" font-family="sans-serif" font-weight="700" font-size="9" fill="#065f46">3. LLM</text>
            <text x="456" y="65" font-family="sans-serif" font-size="7.5" fill="#047857">Groq LPU</text>
            <text x="456" y="79" font-family="sans-serif" font-size="7.5" fill="#047857">Review!</text>

            <defs>
                <marker id="arr2" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>
                </marker>
            </defs>
        </svg>
    </div>
    """
    pages.append(p(2, page2_content))

    # ---------------- PAGE 3 ----------------
    page3_content = """
    <div class="chapter-tag">CHAPTER 3</div>
    <div class="section-title">Meet CodeSense: The Autonomous AI Reviewer</div>

    <p>Now that you understand LLMs and RAG, let's look at what <strong>CodeSense</strong> actually is and how it solves real-world developer problems.</p>

    <h3>The Developer's Dilemma: The PR Waiting Room</h3>
    <p>In modern software engineering, developers write code on separate branches and submit a <strong>Pull Request (PR)</strong> on GitHub asking teammates to review and approve their code before it merges into the main production system.</p>
    <div class="card-grid">
        <div class="info-card card-rose">
            <div class="info-card-header" style="color: #e11d48;">The Old Way: Human Waiting Bottlenecks</div>
            <ul>
                <li>PRs sit in queue for <strong>6 to 48 hours</strong> waiting for busy senior developers.</li>
                <li>Engineers context-switch to other tasks, forgetting their own code logic.</li>
                <li>Tired reviewers overlook critical security bugs or unhandled errors.</li>
                <li>Standard linters only check commas and indentation, not architectural logic.</li>
            </ul>
        </div>
        <div class="info-card card-emerald">
            <div class="info-card-header" style="color: #059669;">The CodeSense Way: Autonomous 11s Review</div>
            <ul>
                <li>The exact millisecond a PR is opened, CodeSense activates automatically.</li>
                <li>Retrieves relevant codebase patterns and tests line bounds in <strong>under 12 seconds</strong>.</li>
                <li>Places polite, accurate comments directly onto the exact offending lines in GitHub.</li>
                <li>Learns from developer feedback to stop making unwanted comments over time.</li>
            </ul>
        </div>
    </div>

    <h3>The 4 High-Level Layers of CodeSense</h3>
    <div class="step-box">
        <div class="step-num" style="background:#0284c7;">A</div>
        <div class="step-content">
            <div class="step-title">1. The Front Door (Go Webhook Handler)</div>
            <p>Listens on the public internet for GitHub's webhook notifications. Verifies the cryptographic security badge (HMAC-SHA256) so malicious hackers can't send forged PR notifications.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num" style="background:#dc2626;">B</div>
        <div class="step-content">
            <div class="step-title">2. The Buffer Queue (Redis List)</div>
            <p>If 20 developers open PRs at 5:00 PM, Redis holds the review requests in a memory queue so our backend services never crash from sudden traffic spikes.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num" style="background:#7c3aed;">C</div>
        <div class="step-content">
            <div class="step-title">3. The Brain (Python Code Intelligence Engine)</div>
            <p>Houses Tree-Sitter (grammar parser), CodeBERT (neural vector embedder), ChromaDB (memory vault), and Groq Cloud (ultra-fast LLM inference).</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num" style="background:#16a34a;">D</div>
        <div class="step-content">
            <div class="step-title">4. The Execution Worker (Go Review Worker & Postgres)</div>
            <p>Validates line boundaries, posts inline comments to GitHub via REST API, writes records to PostgreSQL, and broadcasts real-time events to the React web dashboard over WebSockets.</p>
        </div>
    </div>
    """
    pages.append(p(3, page3_content))

    # ---------------- PAGE 4 ----------------
    page4_content = """
    <div class="chapter-tag">CHAPTER 4</div>
    <div class="section-title">Under the Hood: Building Blocks 1 & 2</div>

    <p>Let's look into the two foundational technologies that allow CodeSense to understand code like a human programmer: <strong>Tree-Sitter</strong> and <strong>CodeBERT</strong>.</p>

    <h3>Building Block 1: Tree-Sitter & Abstract Syntax Trees (AST)</h3>
    <p>Most basic AI tools treat code like a book: a stream of plain text words. But code is NOT plain text! Code has strict grammar rules with nested functions, loops, and scopes.</p>
    <div class="analogy-box">
        <div class="analogy-title">💡 The Analogy: Sentence Diagramming vs. Word Counting</div>
        In school, you don't just count letters in a sentence; you identify the <em>subject</em>, <em>verb</em>, and <em>object</em>. Tree-Sitter does this for code! It converts messy text into a neat, branching family tree called an <strong>Abstract Syntax Tree (AST)</strong>.
    </div>

    <!-- Tree-Sitter Visual Diagram -->
    <div class="diagram-container">
        <svg width="500" height="95" viewBox="0 0 500 95" xmlns="http://www.w3.org/2000/svg">
            <!-- Root -->
            <rect x="190" y="5" width="120" height="22" rx="4" fill="#312e81" stroke="#6366f1" stroke-width="1"/>
            <text x="202" y="20" font-family="monospace" font-weight="700" font-size="9" fill="#ffffff">function_definition</text>

            <!-- Lines from root -->
            <line x1="210" y1="27" x2="100" y2="50" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="250" y1="27" x2="250" y2="50" stroke="#94a3b8" stroke-width="1.5"/>
            <line x1="290" y1="27" x2="400" y2="50" stroke="#94a3b8" stroke-width="1.5"/>

            <!-- Child 1 -->
            <rect x="40" y="50" width="120" height="20" rx="4" fill="#e0e7ff" stroke="#818cf8" stroke-width="1"/>
            <text x="48" y="64" font-family="monospace" font-size="8" fill="#3730a3">name: "calculate_tax"</text>

            <!-- Child 2 -->
            <rect x="190" y="50" width="120" height="20" rx="4" fill="#e0e7ff" stroke="#818cf8" stroke-width="1"/>
            <text x="202" y="64" font-family="monospace" font-size="8" fill="#3730a3">parameters: (amount)</text>

            <!-- Child 3 -->
            <rect x="340" y="50" width="120" height="20" rx="4" fill="#e0e7ff" stroke="#818cf8" stroke-width="1"/>
            <text x="355" y="64" font-family="monospace" font-size="8" fill="#3730a3">block: { return ... }</text>

            <text x="140" y="88" font-family="sans-serif" font-size="8" font-weight="600" fill="#475569">Tree-Sitter extracts exact function boundaries across Python, Go, JS & TS!</text>
        </svg>
    </div>

    <h3>Building Block 2: CodeBERT (Turning Code Into Meaningful Math)</h3>
    <p>Computers cannot compare concepts using English words. They can only compare numbers. <strong>CodeBERT</strong> is a specialized neural network built by Microsoft that translates code into a list of <strong>768 numbers</strong> (called a <strong>Vector Embedding</strong>).</p>

    <div class="card-grid">
        <div class="info-card card-purple">
            <div class="info-card-header" style="color: #7c3aed;">Semantic Proximity in Vector Space</div>
            <p>If two programmers write different code that performs the same logical task:</p>
            <ul>
                <li>Developer A: <code>def delete_user(uid): ...</code></li>
                <li>Developer B: <code>def remove_account(id): ...</code></li>
            </ul>
            <p>CodeBERT produces 768 numbers for both that sit right next to each other in mathematical space!</p>
        </div>
        <div class="info-card card-blue">
            <div class="info-card-header" style="color: #2563eb;">Why Keyword Search Fails on Code</div>
            <p>If you search for <code>remove</code> with simple Ctrl+F (keyword search), you will completely miss <code>delete_user</code> because the words don't match!</p>
            <p>CodeBERT understands <strong>synonyms and intent</strong>, allowing CodeSense to find related code even when completely different names are used.</p>
        </div>
    </div>
    """
    pages.append(p(4, page4_content))

    # ---------------- PAGE 5 ----------------
    page5_content = """
    <div class="chapter-tag">CHAPTER 4 (CONTINUED)</div>
    <div class="section-title">Under the Hood: Building Blocks 3 & 4</div>

    <h3>The "Crowded Corner" Mystery (BERT Anisotropy Explained Simply)</h3>
    <p>When we first ran CodeBERT on our code, we noticed something weird: almost every function in the repo had a <strong>99% similarity score</strong> to every other function! Even a database function and a frontend button showed 98% match!</p>
    <div class="analogy-box">
        <div class="analogy-title">💡 The Analogy: The Giant Room with Everyone Crammed in One Corner</div>
        Imagine a giant auditorium with room for 1,000 people. But for some strange reason, every single person crowds into a tiny 2-foot corner near the door! If you measure the distance between any two people in the room, they are all 2 inches apart. That's what BERT models do in mathematical space (called <strong>Anisotropy</strong>).
    </div>
    <p>In <code>search.py</code>, we wrote a <strong>calibration curve</strong> that spreads that crowded cluster out across a realistic <strong>50% to 99% scale</strong>. Now, truly related functions score 90%+, while unrelated functions drop to 50%!</p>

    <h3>Building Block 3: ChromaDB (The High-Speed Memory Vault)</h3>
    <p>Once CodeBERT turns our code into 768-number vectors, where do we put them? We store them in <strong>ChromaDB</strong>, an AI-native vector database.</p>
    <ul>
        <li><strong>How does it search so fast?</strong> It uses an algorithm called <strong>HNSW (Hierarchical Navigable Small World)</strong>. Think of it like a highway system: instead of driving down every single side street to find a house, it takes an express highway to the right city, an avenue to the right neighborhood, and a local street to the exact house in under <strong>50 milliseconds</strong>!</li>
    </ul>

    <h3>Building Block 4: Groq Cloud LPUs & Deterministic LLMs</h3>
    <div class="card-grid">
        <div class="info-card card-amber">
            <div class="info-card-header" style="color: #d97706;">⚡ Why Groq is 10x Faster Than GPUs</div>
            <p>Standard AI runs on GPUs (Graphics Processing Units) that waste time moving data back and forth from external memory. Groq invented the <strong>LPU (Language Processing Unit)</strong>, where model weights stay directly on the chip, generating over <strong>300 tokens per second</strong>!</p>
        </div>
        <div class="info-card card-emerald">
            <div class="info-card-header" style="color: #059669;">🎯 Why Temperature = 0.1 is Mandatory</div>
            <p>When writing poetry, you want high temperature (0.8) so the AI gets creative. But in code review, <strong>creativity is dangerous!</strong> You want cold, deterministic, strict mathematical analysis. Setting temperature to 0.1 prevents wild guesses and ensures reproducible reviews.</p>
        </div>
    </div>
    """
    pages.append(p(5, page5_content))

    # ---------------- PAGE 6 ----------------
    page6_content = """
    <div class="chapter-tag">CHAPTER 5</div>
    <div class="section-title">The Complete Pipeline: From Git Push to PR Comment</div>

    <p>Here is the exact step-by-step journey of how a single line of code travels through CodeSense in just <strong>11.4 seconds</strong>:</p>

    <!-- Pipeline Step by Step -->
    <div class="step-box">
        <div class="step-num">1</div>
        <div class="step-content">
            <div class="step-title">Developer Opens PR on GitHub (T = 0.0s)</div>
            <p>You push code to a branch and click <em>Create Pull Request</em>. GitHub instantly fires an automated HTTP POST request (a Webhook) to CodeSense's public URL.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">2</div>
        <div class="step-content">
            <div class="step-title">Go Webhook Handler Checks the Badge (T + 0.05s)</div>
            <p>Our lightweight Go service reads GitHub's cryptographic signature (<code>X-Hub-Signature-256</code>) and validates it in constant time. It sets a Redis lock (<code>SetNX</code>) so duplicate webhooks don't trigger double reviews, and pushes the job into Redis List <code>review_jobs</code>.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">3</div>
        <div class="step-content">
            <div class="step-title">Review Worker Fetches the Unified Diff (T + 0.35s)</div>
            <p>A background Go worker waiting on Redis picks up the job and calls GitHub's REST API to download the <strong>unified diff</strong> (only the lines that changed, without cloning the multi-gigabyte repo!).</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">4</div>
        <div class="step-content">
            <div class="step-title">Python Engine Parses AST & Embeds Vectors (T + 2.1s)</div>
            <p>Tree-Sitter parses the modified files to extract the exact function nodes. CodeBERT converts the code into a 768-number vector embedding.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">5</div>
        <div class="step-content">
            <div class="step-title">Hybrid Search Queries ChromaDB (T + 2.2s)</div>
            <p>ChromaDB searches the existing codebase for similar functions. CodeSense merges dense vector similarity with keyword BM25 search using <strong>Reciprocal Rank Fusion (RRF)</strong>.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">6</div>
        <div class="step-content">
            <div class="step-title">Groq LLM Generates Review Comments (T + 10.6s)</div>
            <p>We send the diff + similar functions + past rejection rules to Groq's <code>openai/gpt-oss-120b</code> model. It outputs a clean JSON list of bugs, severity levels, and suggested fixes.</p>
        </div>
    </div>
    <div class="step-box">
        <div class="step-num">7</div>
        <div class="step-content">
            <div class="step-title">Line Guardrail & GitHub Publishing (T + 11.4s)</div>
            <p>The Go worker validates that each comment targets a line that <em>actually changed</em> (preventing GitHub API 422 errors), posts the comments directly to the PR, saves records in PostgreSQL, and alerts the dashboard via WebSockets!</p>
        </div>
    </div>
    """
    pages.append(p(6, page6_content))

    # ---------------- PAGE 7 ----------------
    page7_content = """
    <div class="chapter-tag">CHAPTER 6</div>
    <div class="section-title">Key Features That Make CodeSense Special</div>

    <h3>1. In-Line PR Comments (Precision Targeting)</h3>
    <p>Instead of posting one giant wall of text at the bottom of the pull request, CodeSense attaches each comment to the <strong>exact line of code</strong> where the issue exists. Developers can click <em>Apply Suggestion</em> directly in GitHub with a single click!</p>

    <h3>2. Three Clear Severity Levels</h3>
    <div class="card-grid-3">
        <div class="info-card card-rose">
            <div class="info-card-header" style="color: #e11d48;">🔴 Error (Critical)</div>
            <p>Severe security vulnerabilities, memory leaks, SQL injections, or unhandled exceptions that will crash production.</p>
        </div>
        <div class="info-card card-amber">
            <div class="info-card-header" style="color: #d97706;">🟡 Warning (Important)</div>
            <p>Performance anti-patterns, missing database connection timeouts, or unhandled edge cases.</p>
        </div>
        <div class="info-card card-blue">
            <div class="info-card-header" style="color: #2563eb;">🔵 Info (Suggestion)</div>
            <p>Code readability improvements, idiomatic naming conventions, or missing documentation comments.</p>
        </div>
    </div>

    <h3>3. Closed-Loop Feedback: The AI That Learns From You</h3>
    <p>Traditional linters never learn; if you disagree with a rule, you have to write ugly disable comments like <code># noqa: E501</code>. CodeSense introduces <strong>in-context closed-loop learning</strong>:</p>
    <ul>
        <li>On the CodeSense dashboard, developers can vote <strong>Accepted 👍</strong> or <strong>Rejected 👎</strong> on any comment.</li>
        <li>When an engineer rejects a comment, CodeSense logs the decision in PostgreSQL.</li>
        <li>On future reviews for that repo, CodeSense injects the rejected pattern into the prompt: <em>"Do not warn about X, because the team explicitly rejected this advice."</em></li>
        <li>The system gets smarter and better tuned to your team's culture over time <strong>without needing expensive AI re-training</strong>!</li>
    </ul>

    <h3>4. Real-Time Live Feed via WebSockets</h3>
    <p>Using Go's Gorilla WebSocket hub and Redis Pub/Sub, the React web dashboard streams live review events in real time. Engineering managers can watch PRs being reviewed live without ever hitting browser refresh.</p>

    <h3>5. Architectural Codebase Assistant</h3>
    <p>Under the Assistant tab, CodeSense can summarize the high-level architecture of any indexed repository by analyzing all extracted AST function signatures and explaining how services talk to one another.</p>
    """
    pages.append(p(7, page7_content))

    # ---------------- PAGE 8 ----------------
    page8_content = """
    <div class="chapter-tag">CHAPTER 7</div>
    <div class="section-title">Live Case Study: A Real Code Review in Action</div>

    <p>Let's look at an actual real-world code review executed on our live test repository (<strong>CryptoShield PR #1</strong>):</p>

    <h3>The Developer's Code Submission (Diff)</h3>
    <div class="code-snippet" style="background:#1e1b4b; border-color:#4338ca;">// Added in auth_controller.py
def process_user_login(username, password, retry_count=0, history=[]):
    db_conn = create_raw_socket("tcp://db.internal:5432")
    user = query_user(username, password)
    history.append(user)
    return user</div>

    <h3>What CodeSense Did Behind the Scenes:</h3>
    <ol>
        <li><strong>Tree-Sitter</strong> identified that a new function <code>process_user_login</code> was declared with 4 parameters.</li>
        <li><strong>ChromaDB</strong> searched existing code and retrieved our standard <code>get_db_pool()</code> connection function.</li>
        <li><strong>Groq LLM</strong> cross-referenced the diff and spotted two dangerous Python anti-patterns and a resource leak.</li>
        <li><strong>Line Guardrail</strong> confirmed line 1 and line 2 were newly added lines in the PR.</li>
    </ol>

    <h3>The Result: Inline Review Comments Posted Directly on GitHub</h3>
    <div class="info-card card-rose" style="margin-bottom:8px;">
        <div class="info-card-header" style="color:#e11d48;">
            <span>🔴 Line 1: Dangerous Mutable Default Argument</span>
            <span style="margin-left:auto; font-size:7.5pt; background:#fee2e2; padding:1px 6px; border-radius:4px;">Severity: Error</span>
        </div>
        <p><strong>CodeSense Comment:</strong> <em>"Using a mutable list <code>history=[]</code> as a default argument causes shared state across all function calls in Python. Subsequent logins will append to the same memory address! Replace with <code>history=None</code> and initialize inside the function."</em></p>
    </div>

    <div class="info-card card-amber">
        <div class="info-card-header" style="color:#d97706;">
            <span>🟡 Line 2: Unpooled Database Connection & Resource Leak</span>
            <span style="margin-left:auto; font-size:7.5pt; background:#fef3c7; padding:1px 6px; border-radius:4px;">Severity: Warning</span>
        </div>
        <p><strong>CodeSense Comment:</strong> <em>"Creating raw TCP socket connections on every login exhausts connection limits under load. Our codebase already provides <code>get_db_pool()</code> in <code>database.py</code>. Consider wrapping this in a connection pool context manager."</em></p>
    </div>
    """
    pages.append(p(8, page8_content))

    # ---------------- PAGE 9 ----------------
    page9_content = """
    <div class="chapter-tag">CHAPTER 8</div>
    <div class="section-title">Beginner's Glossary & 10 Essential Q&As</div>

    <h3>Plain-English Quick Glossary</h3>
    <table>
        <thead>
            <tr>
                <th>Term</th>
                <th>In Plain English</th>
                <th>Where It Lives in CodeSense</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>LLM</strong></td>
                <td>A massive neural network that predicts the best words or code.</td>
                <td>Groq Cloud API (<code>openai/gpt-oss-120b</code>)</td>
            </tr>
            <tr>
                <td><strong>RAG</strong></td>
                <td>Searching the textbook first, then giving the page to the LLM.</td>
                <td>ChromaDB + Code Intelligence router</td>
            </tr>
            <tr>
                <td><strong>AST</strong></td>
                <td>A family tree diagram of code syntax (functions, loops).</td>
                <td>Tree-Sitter (<code>ast_parser.py</code>)</td>
            </tr>
            <tr>
                <td><strong>Embedding</strong></td>
                <td>Translating code into 768 numbers representing meaning.</td>
                <td>Microsoft CodeBERT (<code>embeddings.py</code>)</td>
            </tr>
            <tr>
                <td><strong>Anisotropy</strong></td>
                <td>The problem where all vectors crowd into one corner.</td>
                <td>Calibrated in <code>search.py</code></td>
            </tr>
            <tr>
                <td><strong>Webhook</strong></td>
                <td>A real-time notification sent over HTTP when an event happens.</td>
                <td>GitHub $\to$ Go Webhook Handler (Port 8000)</td>
            </tr>
            <tr>
                <td><strong>HMAC-SHA256</strong></td>
                <td>A cryptographic wax seal that proves a message came from GitHub.</td>
                <td>Verified via <code>hmac.Equal()</code> in Go</td>
            </tr>
            <tr>
                <td><strong>HNSW</strong></td>
                <td>A multi-layer highway graph for sub-50ms vector searches.</td>
                <td>Internal indexing algorithm in ChromaDB</td>
            </tr>
        </tbody>
    </table>

    <h3>Top 5 Questions a Beginner Should Be Ready to Answer</h3>
    <ol>
        <li><strong>Q: What is the main difference between CodeSense and a basic linter like ESLint?</strong><br>
        <em>A: Linters check static grammar rules (missing semicolons); CodeSense understands semantic logic, cross-file context, and business architecture via RAG and LLMs.</em></li>
        <li><strong>Q: Why not just use ChatGPT directly to review code?</strong><br>
        <em>A: ChatGPT doesn't know your private codebase, has no diff guardrails, hallucinates invalid line numbers, and requires slow manual copy-pasting. CodeSense is completely autonomous and integrated into GitHub.</em></li>
        <li><strong>Q: What is Tree-Sitter doing in one sentence?</strong><br>
        <em>A: It parses raw code into a structured syntax tree so we can extract exact function boundaries across Python, Go, JS, and TS.</em></li>
        <li><strong>Q: Why do we use Redis?</strong><br>
        <em>A: Redis buffers review jobs in a memory queue so sudden bursts of pull requests never overwhelm our worker services.</em></li>
        <li><strong>Q: How does CodeSense prevent AI hallucinations?</strong><br>
        <em>A: By setting LLM temperature to 0.1, injecting real codebase context via RAG, and programmatically rejecting any comment that doesn't fall on an actual changed line.</em></li>
    </ol>
    """
    pages.append(p(9, page9_content))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CodeSense: The Beginner's Illustrated Guide to LLMs, RAG & Autonomous Code Review</title>
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
    print("Building Beginner's Guide HTML document...")
    html_content = build_html()
    html_file = os.path.abspath("codesense_beginner_guide.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"HTML written to {html_file}")

    pdf_file = os.path.abspath("CodeSense_Beginners_Visual_Guide_to_LLMs_and_RAG.pdf")
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    print("Compiling Beginner's Guide PDF using Microsoft Edge headless...")
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
