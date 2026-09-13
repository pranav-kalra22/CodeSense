-- init.sql

CREATE TABLE IF NOT EXISTS repositories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_full_name VARCHAR(255) UNIQUE NOT NULL,
    webhook_secret VARCHAR(255) NOT NULL,
    indexed_at TIMESTAMPTZ,
    config JSONB DEFAULT '{}',
    custom_instructions TEXT,
    is_paused BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pull_request_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_full_name VARCHAR(255) NOT NULL,
    pr_number INT NOT NULL,
    pr_title VARCHAR(500),
    head_sha VARCHAR(40),
    status VARCHAR(50) DEFAULT 'PENDING',
    total_comments INT DEFAULT 0,
    processing_time_ms INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_read_status VARCHAR(20) DEFAULT 'unread'
);

CREATE TABLE IF NOT EXISTS review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES pull_request_reviews(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    line_number INT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    comment_text TEXT NOT NULL,
    github_comment_id BIGINT,
    feedback_status VARCHAR(20) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    category VARCHAR(50) DEFAULT 'general',
    code_snippet TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS review_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_comment_id UUID REFERENCES review_comments(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('accepted', 'rejected', 'modified')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance on frequently queried foreign keys and filters
CREATE INDEX IF NOT EXISTS idx_feedback_comment_id ON review_feedback(review_comment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON review_feedback(feedback_type);