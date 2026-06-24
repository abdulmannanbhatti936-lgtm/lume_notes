# Contributing to lume notes

Thank you for your interest in contributing to lume notes! This document provides guidelines and information for contributors.

## Table of Contents

- [About This Project](#about-this-project)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Pull Requests](#pull-requests)
- [Issue Reporting](#issue-reporting)
- [Code Review](#code-review)
- [Deployment](#deployment)
- [Community Guidelines](#community-guidelines)

## About This Project

lume notes is a multi-tenant notes application built with Next.js, featuring role-based access control and subscription management. It's designed as a learning project and proof-of-concept.

**Important Notes:**

- This is not production-ready software
- Not intended for commercial use
- Use for learning and experimentation only

## Getting Started

### Prerequisites

- **Node.js 20+** - Required runtime
- **pnpm** - Package manager
- **PostgreSQL** - Database (local or hosted like Supabase/Neon)
- **Git** - Version control

### Local Development Setup

1. **Fork and Clone the Repository**

   ```bash
   git clone https://github.com/abdulmannanbhatti936-lgtm/lume_notes.git
   cd lume_notes
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**

   ```bash
   cd apps/web
   cp .env.example .env  # If example exists, otherwise create manually
   ```

   Add the following to `.env`:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/lume_notes"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-nextauth-secret-here"
   ```

4. **Set Up Database**

   ```bash
   # Run migrations
   pnpm db:migrate

   # Seed with test data
   pnpm db:seed
   ```

5. **Start Development Server**

   ```bash
   pnpm dev
   ```

   The application will be available at `http://localhost:3000`.

### Test Accounts

For testing, use these pre-seeded accounts (password: `password`):

**Acme Tenant:**

- `admin@acme.test` (Admin)
- `user@acme.test` (Member)

**Globex Tenant:**

- `admin@globex.test` (Admin)
- `user@globex.test` (Member)

## Development Workflow

### Development Tools

This project uses several tools to maintain code quality:

- **EditorConfig**: Maintains consistent coding styles across editors
- **Husky**: Git hooks for automated checks
- **lint-staged**: Run linters on staged files only
- **Commitlint**: Enforce conventional commit messages
- **Commitizen**: Interactive commit prompts
- **Prettier**: Code formatting
- **ESLint**: Code linting

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run linting
pnpm typecheck        # Run TypeScript type checking

# Testing
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests
pnpm test:integration # Run integration tests
pnpm test:watch       # Run tests in watch mode

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with test data

# Git & Commits
pnpm commit           # Interactive commit with conventional format
```

### Pre-commit Hooks

The following checks run automatically when you commit:

1. **lint-staged**: Formats and lints only staged files
2. **commitlint**: Validates commit message format

## Code Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Prefer `const` over `let`, avoid `var`

### React Components

- Use functional components with hooks
- Follow the existing component structure
- Use TypeScript interfaces for props
- Implement proper error boundaries where needed
- Follow accessibility guidelines (WCAG 2.1)

### Database & API

- All database queries must include tenant isolation
- Use Prisma's type-safe queries
- Validate input data on API endpoints
- Return consistent error responses
- Document API endpoints in the README

### File Organization

```plaintext
apps/web/
├── app/              # Next.js app router pages
├── components/       # Reusable React components
├── lib/              # Utility functions and configurations
├── hooks/            # Custom React hooks
├── styles/           # Global styles and CSS
└── prisma/           # Database schema and migrations
```

## Git Workflow

### Branch Naming

Use descriptive branch names following this pattern:

```text
<type>/<description>
```

Examples:

```text
feat/add-user-authentication
fix/login-validation-bug
docs/update-api-documentation
refactor/cleanup-components
```

### Commit Messages

This project follows [Conventional Commits](https://conventionalcommits.org/) specification.

**Format:**

```text
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `perf`: Performance improvements
- `revert`: Reverting changes

**Examples:**

```bash
feat(auth): add NextAuth session validation
fix(ui): resolve mobile layout issues
docs(readme): update installation instructions
refactor(components): simplify note editor logic
```

**Interactive Commits:**

```bash
pnpm commit
```

This provides an interactive prompt to create properly formatted commits.

## Testing

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test API endpoints and database interactions
- **E2E Tests**: Test complete user workflows (Playwright)

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test types
pnpm test:unit
pnpm test:integration

# Run tests in watch mode
pnpm test:watch

# Run tests for specific package
pnpm test --filter ./apps/web
```

### Writing Tests

- Write tests for new features and bug fixes
- Aim for good test coverage (>80%)
- Use descriptive test names
- Follow the existing test patterns
- Test both success and error scenarios

### Test Files Location

```plaintext
apps/web/
├── __tests__/          # Unit and integration tests
├── e2e/               # End-to-end tests
└── components/        # Component tests alongside components
```

## Pull Requests

### Before Submitting

1. **Update your branch** with the latest main
2. **Run all tests** and ensure they pass
3. **Run linting** and fix any issues
4. **Test your changes** manually
5. **Update documentation** if needed
6. **Write clear commit messages**

### PR Template

Use the provided PR template and fill out:

- **Description**: What changes and why
- **Checklist**: Confirm all requirements are met
- **Testing notes**: How you tested the changes
- **Screenshots**: For UI changes

### PR Process

1. **Create PR** from your feature branch to `main`
2. **CI Checks** will run automatically
3. **Code Review** will be requested
4. **Address feedback** and make necessary changes
5. **Merge** once approved

### PR Requirements

- [ ] Code follows project standards
- [ ] Tests pass locally
- [ ] TypeScript compiles successfully
- [ ] Linting passes
- [ ] CI passes
- [ ] Documentation updated if needed
- [ ] Breaking changes documented

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Environment**: Node version, OS, browser
- **Steps to reproduce**: Clear, numbered steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Screenshots/Logs**: Visual evidence or error logs

### Feature Requests

Use the feature request template and include:

- **Summary**: One-line description
- **Motivation**: Why this feature is needed
- **Alternatives**: Other solutions considered
- **Additional context**: Mockups, links, etc.

### Questions

For general questions or discussions:

- Use [GitHub Discussions](https://github.com/abdulmannanbhatti936-lgtm/lume_notes/discussions)
- Check existing issues and discussions first

## Code Review

### Review Process

1. **Automated Checks**: CI must pass
2. **Peer Review**: At least one maintainer review
3. **Feedback**: Address all review comments
4. **Approval**: Maintainers approve before merge

### Review Guidelines

**For Reviewers:**

- Be constructive and respectful
- Focus on code quality and maintainability
- Suggest improvements, don't dictate
- Approve when requirements are met

**For Contributors:**

- Be open to feedback
- Explain your reasoning when questioned
- Make requested changes promptly
- Ask for clarification if needed

### Review Checklist

- [ ] Code is readable and well-documented
- [ ] Follows project conventions
- [ ] Tests are included and passing
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Breaking changes are documented

## Deployment

### Automatic Deployment

- **Vercel**: Deploys automatically on push to `main`
- **CI/CD**: Runs tests and builds on every PR

### Manual Deployment

```bash
# Build the application
pnpm build

# Run production database migrations
pnpm db:migrate:prod
```

### Environment Variables

Ensure these are set in your deployment environment:

- `DATABASE_URL`: Production database connection
- `NEXTAUTH_URL`: Base URL of your application
- `NEXTAUTH_SECRET`: Secret for NextAuth session encryption

## Community Guidelines

### Code of Conduct

This project follows a code of conduct. Please:

- Be respectful and inclusive
- Focus on constructive feedback
- Help create a positive environment
- Report unacceptable behavior

### Getting Help

- **Documentation**: Check README.md and this file
- **Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact maintainers for sensitive matters

### Recognition

Contributors are recognized through:

- GitHub contributor statistics
- Mention in release notes
- Attribution in documentation

---

Thank you for contributing to lume notes! Your help makes this project better for everyone. 🚀
