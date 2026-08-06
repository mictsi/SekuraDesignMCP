# Security

## Reporting a vulnerability

Report privately through GitHub's [security advisory][advisory] form rather than
opening a public issue. Expect an acknowledgement within three working days.

[advisory]: https://github.com/mictsi/SekuraDesignMCP/security/advisories/new

## Scope

This project is a **design system and an MCP server that describes it**. It holds
no user data, has no authentication, and performs no network calls of its own.
That shapes what is and is not a vulnerability here.

**In scope**

- Anything in the MCP server that lets a caller read or write outside the
  repository — path traversal in the sample server, unsafe file resolution.
- Code injection through tool arguments, particularly `validate_markup`, which
  accepts arbitrary markup.
- Container issues: privilege escalation, a writable filesystem where the image
  declares read-only.
- Supply-chain problems in the published artifacts.

**Out of scope**

- The generated CSS and HTML are meant to be embedded in a host page. XSS caused
  by a *consumer* interpolating untrusted data into that markup is the
  consumer's responsibility, not a flaw here.
- Denial of service through deliberately enormous `validate_markup` input. The
  endpoint is not intended to be exposed to untrusted callers.

## Deployment notes

The MCP server has **no authentication**. Do not expose port 8080 to an
untrusted network. It is designed to run on localhost or inside a trusted
network segment, reached by a developer's own tooling.

The container runs unprivileged (`USER node`), with a read-only filesystem and
all capabilities dropped in the supplied compose file. Keep those settings.

`validate_markup` parses markup with regular expressions and never executes it.
No tool evaluates caller-supplied code.
