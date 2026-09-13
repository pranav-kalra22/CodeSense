package models

type WebhookPayload struct {
	Action      string      `json:"action"`
	Before      string      `json:"before"`
	After       string      `json:"after"`
	PullRequest PullRequest `json:"pull_request"`
	Repository  Repository  `json:"repository"`
}

type PullRequest struct {
	Number  int    `json:"number"`
	Title   string `json:"title"`
	DiffURL string `json:"diff_url"`
	Head    Ref    `json:"head"`
	Base    Ref    `json:"base"`
}

type Ref struct {
	SHA string `json:"sha"`
}

type Repository struct {
	FullName string `json:"full_name"`
	CloneURL string `json:"clone_url"`
}

type Message struct {
	Msg string `json:"msg"`
}

type ReviewJob struct {
	Repo               string `json:"repo"`
	PRNum              int    `json:"pr_number"`
	Action             string `json:"action"`
	Before             string `json:"before"`
	After              string `json:"after"`
	DiffURL            string `json:"diff_url"`
	HeadSHA            string `json:"head_sha"`
	BaseSHA            string `json:"base_sha"`
	CustomInstructions string `json:"custom_instructions"`
}
