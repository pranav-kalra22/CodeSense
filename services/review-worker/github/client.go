package github

import (
	"context"
	"fmt"

	"github.com/google/go-github/v62/github"
	"golang.org/x/oauth2"
)

type Client struct {
	GitHub *github.Client
}

// NewClient initializes a GitHub client using your Personal Access Token
func NewClient(ctx context.Context, token string) *Client {
	ts := oauth2.StaticTokenSource(
		&oauth2.Token{AccessToken: token},
	)
	tc := oauth2.NewClient(ctx, ts)

	return &Client{
		GitHub: github.NewClient(tc),
	}
}

// FetchPRDiff retrieves the FULL code changes for a brand new PR
func (c *Client) FetchPRDiff(ctx context.Context, owner, repo string, prNum int) (string, error) {
	opt := &github.RawOptions{Type: github.Diff}

	diff, resp, err := c.GitHub.PullRequests.GetRaw(ctx, owner, repo, prNum, *opt)
	if err != nil {
		return "", fmt.Errorf("failed to fetch full PR diff: %w", err)
	}
	defer resp.Body.Close()

	return diff, nil
}

// --- NEW: FetchCommitDiff retrieves ONLY the changes between two specific commits ---
func (c *Client) FetchCommitDiff(ctx context.Context, owner, repo, baseSHA, headSHA string) (string, error) {
	opt := github.RawOptions{Type: github.Diff}

	diff, resp, err := c.GitHub.Repositories.CompareCommitsRaw(ctx, owner, repo, baseSHA, headSHA, opt)
	if err != nil {
		return "", fmt.Errorf("failed to fetch incremental diff: %w", err)
	}
	defer resp.Body.Close()

	return diff, nil
}

// CreateDraftComment is a helper to build the GitHub struct
func NewComment(path string, line int, body string) *github.DraftReviewComment {
	return &github.DraftReviewComment{
		Path: github.String(path),
		Line: github.Int(line),
		Side: github.String("RIGHT"), // "RIGHT" means the new version of the file
		Body: github.String(body),
	}
}

// PostReviewComments bundles the comments together and posts them to the PR
func (c *Client) PostReviewComments(ctx context.Context, owner, repo string, prNum int, comments []*github.DraftReviewComment) error {
	review := &github.PullRequestReviewRequest{
		Body:     github.String(" **AI Code Review**\nAutomated review by your AI Assistant."),
		Event:    github.String("COMMENT"), // We are just leaving comments, not officially "Approving" or "Rejecting"
		Comments: comments,
	}

	_, _, err := c.GitHub.PullRequests.CreateReview(ctx, owner, repo, prNum, review)
	if err != nil {
		return fmt.Errorf("failed to create review: %w", err)
	}

	return nil
}
