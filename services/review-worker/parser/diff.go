package parser

import (
	"fmt"
	"strings"

	"github.com/sourcegraph/go-diff/diff"
)

// DiffLine represents a single line of code that was added
type DiffLine struct {
	Number  int
	Content string
}

// FileDiff represents the changes made to a single file
type FileDiff struct {
	FileName   string
	AddedLines []DiffLine
}

// ParseRawDiff takes the raw diff string and maps out exactly where code was added
func ParseRawDiff(rawDiff string) ([]FileDiff, error) {
	parsedDiffs, err := diff.ParseMultiFileDiff([]byte(rawDiff))
	if err != nil {
		return nil, fmt.Errorf("failed to parse diff: %w", err)
	}

	var files []FileDiff

	for _, d := range parsedDiffs {
		fileName := strings.TrimPrefix(d.NewName, "b/")
		if fileName == "" {
			continue
		}

		var addedLines []DiffLine

		// Go through each chunk (hunk) of changes in the file
		for _, hunk := range d.Hunks {
			lines := strings.Split(string(hunk.Body), "\n")

			// This tracks the line number in the NEW file
			currentLineInNewFile := int(hunk.NewStartLine)

			for _, line := range lines {
				if strings.HasPrefix(line, "+") {
					// We found added code! Save the line number and the text
					addedLines = append(addedLines, DiffLine{
						Number:  currentLineInNewFile,
						Content: strings.TrimPrefix(line, "+"), // Remove the + sign
					})
					currentLineInNewFile++
				} else if strings.HasPrefix(line, "-") {
					// Deleted line. Doesn't exist in the new file, so we don't increment
					continue
				} else {
					// Unchanged context line. Exists in both files, so we increment
					currentLineInNewFile++
				}
			}
		}

		files = append(files, FileDiff{
			FileName:   fileName,
			AddedLines: addedLines,
		})
	}

	return files, nil
}
