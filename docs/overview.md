# Provisioning Notification Hub

## Overview
Provisioning Notification Hub gives Power Platform system admins one operational workspace to capture multi-user access requests, coordinate manual provisioning, maintain application access-control records, and send consistent onboarding notifications. It replaces fragmented ticket notes with a traceable record of who requested access, where access belongs, which security path applies, and what remains before the user can be notified.

## Users
System admins are the sole users in the first release. They enter requests received through ServiceNow or email, prepare handoff details for the provisioning team, confirm GCC synchronization and access, and send completion messages.

## Core scenarios
- Capture a ServiceNow or email request with one or many users and multiple roles.
- Reuse one canonical user record matched by normalized email across multiple applications.
- Maintain one access-control entry per user and application, with environments and roles stored as related assignments.
- Preserve role assignment dates and the signed-in admin responsible for each assignment.
- Open an existing user/application access entry for modification instead of creating a duplicate.
- Track each request-user once through configurable workflow stage options, regardless of role count.
- Configure application environments, direct roles, teams, and security groups.
- Preview and send personalized onboarding messages from application email templates.

- Review attributable activity and notification outcomes.

## First-release boundary
Provisioning, ServiceNow updates, GCC synchronization, and security assignments remain manual. The app tracks those actions, creates clear handoff instructions, enforces notification-readiness checks, and records outcomes. Future integrations can automate ticket intake and system actions without changing the core workflow.

## Design direction
The interface uses a compact industrial operations-console aesthetic: deep navy navigation, cobalt actions, cyan highlights, dense status tables, and clear progression gates. The visual hierarchy favors speed, traceability, and exception handling over decorative presentation.
