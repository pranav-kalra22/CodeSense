package models

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
