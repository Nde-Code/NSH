# Contributing

Thank you for your interest in contributing to NSH. Contributions are welcome, whether they involve improving existing functionality, fixing bugs, or introducing new features.

Before submitting a contribution, please take the time to read the following guidelines.

## Understanding the project

NSH is a small personal project. Its codebase is intentionally kept relatively simple, without extensive documentation or unnecessary architectural complexity.

The technical documentation is available in [`docs/documentation.md`](docs/documentation.md). However, this document mainly covers setup, configuration, and deployment. It is not intended to explain every implementation detail or coding decision.

Before making any changes, you are expected to take the time to explore the repository and understand how the project works.

In particular:

- Read the existing source code and understand its structure.
- Familiarize yourself with how different modules interact.
- Pay attention to existing naming conventions, formatting, coding patterns, and architectural choices.
- Understand how existing functionality is implemented before attempting to modify or extend it.

The existing codebase should be your main reference when working on the project.

The goal is not to introduce new conventions or restructure the project unnecessarily, but to produce code that fits naturally into the existing implementation.

## Code contributions

All submitted code must follow the conventions and patterns already used throughout the project.

Please make sure that:

- Your code follows the existing naming and formatting conventions.
- New functionality is implemented consistently with the existing architecture.
- Changes remain focused and avoid unnecessary complexity.
- Existing functionality is not broken by unrelated modifications.
- Types are properly defined and used throughout the TypeScript codebase.

Avoid introducing additional dependencies, abstractions, or architectural changes unless they are genuinely necessary.

The project intentionally does not use ESLint. For a project of this size, I consider the additional configuration and maintenance unnecessary. TypeScript and Prettier provide the checks needed for the current codebase.

### Comments

Please avoid adding unnecessary comments.

Code should be understandable through its structure, naming, and implementation rather than relying on comments to explain what it does.

Comments should only be added when a particular implementation detail or decision genuinely requires clarification.

## Available commands

The project uses npm scripts to provide the following commands:

| Command                  | Description                                         |
| ------------------------ | --------------------------------------------------- |
| `npm run dev`            | Start the local development server using Wrangler.  |
| `npm run deploy`         | Deploy the Worker.                                  |
| `npm run types`          | Generate Cloudflare Workers TypeScript definitions. |
| `npm run login`          | Authenticate with Cloudflare through Wrangler.      |
| `npm run check-types`    | Check TypeScript types without generating output.   |
| `npm run format`         | Format project files using Prettier.                |
| `npm run prettier-check` | Check formatting without modifying files.           |

## Commit messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

Please use this convention for all commit messages to keep the project history consistent and readable.

## Continuous integration

Every submitted pull request is subject to automated checks.

The CI pipeline includes the following jobs:

- **type-check:** Uses TypeScript (`tsc --noEmit`) to verify that the code is correctly typed and does not contain TypeScript errors.
- **format-check:** Uses Prettier to verify that the submitted code follows the project's formatting rules.

Both checks must pass before a pull request can be accepted.

## Integration testing

In addition to the automated checks, NSH uses a dedicated integration test suite to verify the actual behavior of the service.

The test suite is maintained separately from the repository: [https://gist.github.com/Nde-Code/9192b375dcee12227f9f9c381a929346](https://gist.github.com/Nde-Code/9192b375dcee12227f9f9c381a929346).

This is an intentional choice. The script is relatively large, and keeping it outside the repository avoids adding unnecessary weight to an otherwise lightweight project.

Contributors are expected to read and understand this script and run it against their own revision before submitting a pull request.

The script tests the actual deployed service and interacts with its database. **Never run it against the public NSH instance or another environment for which you do not have explicit authorization.** Use your own isolated deployment and database for testing.

After a pull request has been reviewed and its changes have been placed on the `dev` branch, I will also run the integration test suite as part of the validation process.

If your changes only affect existing functionality already covered by the test suite, simply indicate in your pull request that the integration tests have been executed successfully.

If you introduce new functionality or modify behavior that is not covered by the existing tests, you must also provide precise instructions for updating the integration test script.

These instructions must include:

- The exact code to add or modify.
- The exact location where the changes should be made.
- The necessary test cases and expected results.
- Code formatted consistently with the existing script.

The instructions must be detailed enough to allow the test suite to be updated without requiring additional explanations or guesswork.

## Pull requests

Every pull request must include a clear and sufficiently detailed description of the proposed changes.

Please explain:

- **What:** What has been implemented or modified.
- **Why:** Why the change is necessary and what problem it addresses.
- **How:** How the implementation works and what approach was chosen.
- **Constraints:** Any relevant limitations, technical constraints, or design decisions.

The description should demonstrate that you understand the implementation and the reasons behind your choices.

Before submitting your pull request, please make sure that:

- You have taken the time to understand the existing codebase.
- Your changes follow the project's existing conventions.
- TypeScript checks pass successfully.
- Prettier formatting checks pass successfully.
- The integration test suite has been executed against your revision.
- Any new functionality not covered by the integration tests is properly documented with precise instructions for updating the test script.
- Your pull request clearly explains the purpose and implementation of your changes.

Pull requests containing unexplained changes, unnecessary complexity, or code that does not follow the project's conventions may be rejected.

## AI-assisted contributions

The use of AI tools is absolutely welcome.

However, **you must fully understand every line of code you submit, from beginning to end.**

Using AI to generate, modify, or review code does not remove your responsibility for understanding its behavior, implementation, and potential consequences.

You must be able to explain your changes, justify your technical decisions, and take responsibility for the submitted code.

Code that you cannot properly explain or maintain is not an acceptable contribution, regardless of how it was produced.

## Final notes

NSH is intentionally a small and relatively lightweight project. Maintaining its simplicity, consistency, and reliability is more important than introducing unnecessary features or complexity.

Take the time to understand the project before contributing, and make sure your changes fit naturally into the existing codebase.

Thank you for taking the time to help improve NSH.
