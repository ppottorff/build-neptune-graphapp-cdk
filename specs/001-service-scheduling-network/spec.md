# Feature Specification: Service Scheduling Network

**Feature Branch**: `001-service-scheduling-network`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Build an application that enables networks of companies and individuals to schedule and provide services to each other."

## Assumptions

- Authentication uses the existing Cognito user pool already deployed by the project.
- The graph database (Neptune) is the primary store for network relationships, service offerings, and scheduling connections. Ancillary data (e.g., time-slot availability) may use a supplementary store if needed.
- Notifications (booking confirmations, reminders) are delivered via the existing SNS/email infrastructure.
- Scheduling granularity defaults to 30-minute time slots.
- The system does not process payments; it facilitates scheduling only. Invoicing and payment are out of scope.
- Services are delivered virtually (remote) by default; a location field is optional for in-person services.
- A "network" is an invite-only group of companies and individuals; open marketplace discovery is out of scope for this feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Create and Join a Network (Priority: P1)

A company administrator creates a new service network and invites other companies and individuals to join. Invited members receive an invitation, accept it, and become part of the network. Once inside the network, members can see who else belongs to it.

**Why this priority**: Without a network there are no participants, no service listings, and no scheduling. This is the foundational capability that every other story depends on.

**Independent Test**: Can be fully tested by creating a network, sending an invitation, accepting it, and verifying the member list — delivers a functional, populated network that proves the core graph model works.

**Acceptance Scenarios**:

1. **Given** an authenticated company administrator, **When** they create a new network with a name and description, **Then** the network is created and the administrator is automatically listed as the first member.
2. **Given** a network with at least one member, **When** the administrator invites another user by email, **Then** the invited user receives a notification with an accept/decline action.
3. **Given** a pending invitation, **When** the invited user accepts, **Then** they appear in the network member list and can view other members.
4. **Given** a pending invitation, **When** the invited user declines, **Then** they do not appear in the network and the administrator is notified of the decline.
5. **Given** a network with multiple members, **When** any member views the network, **Then** they see the full list of current members with their names and roles (company or individual).

---

### User Story 2 — List and Browse Services (Priority: P2)

A network member (company or individual) publishes one or more services they offer, including a title, description, duration, and optional location. Other members of the same network can browse and search the catalog of available services.

**Why this priority**: Service listings are the inventory of the marketplace. Without them, there is nothing to schedule. This story is independently valuable because it lets members advertise and discover capabilities within their network.

**Independent Test**: Can be tested by having a member create a service listing and another member browse/search for it within the same network — delivers a visible, searchable service catalog.

**Acceptance Scenarios**:

1. **Given** a member belonging to at least one network, **When** they create a new service with title, description, and estimated duration, **Then** the service is published and visible to other members of the same network.
2. **Given** a network with multiple published services, **When** a member searches by keyword, **Then** the results show only services matching the keyword within that network.
3. **Given** a network with published services, **When** a member browses the service catalog, **Then** services are listed with provider name, title, description, duration, and availability status.
4. **Given** a member who has published services, **When** they edit or remove a service, **Then** the changes are immediately reflected in the catalog for all network members.
5. **Given** a member belonging to multiple networks, **When** they browse services, **Then** they see services only from the currently selected network.

---

### User Story 3 — Schedule a Service Appointment (Priority: P3)

A network member selects a service from the catalog, views the provider's available time slots, and books an appointment. Both the requester and the provider receive confirmation. Either party can cancel or reschedule before the appointment time.

**Why this priority**: Scheduling is the core transaction of the application, but it requires networks (P1) and service listings (P2) to exist first. Once those are in place, this story completes the end-to-end workflow.

**Independent Test**: Can be tested by selecting an existing service, choosing an available slot, confirming the booking, and verifying both parties receive confirmation — delivers a complete scheduling interaction.

**Acceptance Scenarios**:

1. **Given** a published service with available time slots, **When** a member selects the service and chooses a time slot, **Then** the system creates a pending appointment and notifies the provider.
2. **Given** a pending appointment, **When** the provider confirms, **Then** both parties receive a confirmation notification and the time slot is marked as booked.
3. **Given** a confirmed appointment, **When** either party cancels at least 24 hours before the appointment, **Then** the appointment is cancelled, both parties are notified, and the time slot becomes available again.
4. **Given** a confirmed appointment, **When** either party requests a reschedule, **Then** the other party receives a reschedule request with alternative time slots to accept or decline.
5. **Given** a time slot already booked, **When** another member attempts to book the same slot, **Then** the system prevents double-booking and suggests the next available slot.
6. **Given** a provider, **When** they view their schedule, **Then** they see all upcoming appointments across all networks they belong to, sorted chronologically.

---

### User Story 4 — Manage Availability (Priority: P4)

A service provider sets their recurring weekly availability (e.g., Monday–Friday 9:00–17:00) and can block out specific dates or time ranges for holidays, personal time, or other commitments.

**Why this priority**: Availability management improves scheduling efficiency but is not strictly required for an MVP — manual slot management can work initially.

**Independent Test**: Can be tested by setting a weekly schedule, blocking a date, and verifying the booking interface reflects accurate availability — delivers self-service availability control.

**Acceptance Scenarios**:

1. **Given** a service provider, **When** they set recurring weekly availability hours, **Then** those hours are reflected as bookable slots in the scheduling interface.
2. **Given** a provider with recurring availability, **When** they block out a specific date, **Then** no time slots are shown for that date in the booking interface.
3. **Given** a provider with existing appointments, **When** they modify their recurring availability, **Then** already-confirmed appointments are not affected, but future open slots reflect the change.
4. **Given** a provider, **When** they view their own availability calendar, **Then** they see booked slots, open slots, and blocked dates in a unified view.

---

### User Story 5 — Network Dashboard and Activity Feed (Priority: P5)

A network member views a dashboard summarizing their networks, upcoming appointments, recent activity (new members, new services), and pending invitations.

**Why this priority**: The dashboard improves usability and engagement but is an enhancement layer on top of the core scheduling flow.

**Independent Test**: Can be tested by logging in and verifying the dashboard displays correct counts and recent activity items — delivers an at-a-glance overview.

**Acceptance Scenarios**:

1. **Given** an authenticated member, **When** they open the dashboard, **Then** they see a summary of networks they belong to, upcoming appointments (next 7 days), and pending invitations.
2. **Given** a network with recent activity, **When** a member views the activity feed, **Then** they see the 20 most recent events (new members joined, services published, appointments booked) in chronological order.
3. **Given** a member with no upcoming appointments, **When** they view the dashboard, **Then** the appointments section displays a helpful empty state with a link to browse services.

---

### Edge Cases

- What happens when a network administrator leaves or is removed from their own network? The system MUST require at least one administrator per network; the last administrator cannot leave without transferring the role.
- What happens when a service provider deletes a service that has future confirmed appointments? The system MUST notify all affected requesters and cancel the appointments before removing the service.
- How does the system handle time zone differences between provider and requester? All times MUST be stored in UTC and displayed in each user's local time zone.
- What happens when two members attempt to book the same last-available slot simultaneously? The system MUST use optimistic concurrency control to prevent double-booking; the first confirmed booking wins.
- What happens when a member belongs to no networks? The system MUST show an onboarding prompt guiding them to create or join a network.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to create a new network with a name (3–100 characters) and optional description (up to 500 characters).
- **FR-002**: System MUST allow network administrators to invite users by email address; invitations MUST expire after 7 days if not acted upon.
- **FR-003**: System MUST allow invited users to accept or decline network invitations.
- **FR-004**: System MUST display a member directory for each network showing all current members and their roles.
- **FR-005**: System MUST allow network members to create service listings with title, description, estimated duration (in 30-minute increments from 30 to 480 minutes), and optional location.
- **FR-006**: System MUST allow network members to search services by keyword within a selected network.
- **FR-007**: System MUST allow network members to browse all services in a selected network with pagination (20 items per page).
- **FR-008**: System MUST allow service providers to define recurring weekly availability windows.
- **FR-009**: System MUST allow service providers to block specific dates or time ranges.
- **FR-010**: System MUST allow members to book an available time slot for a published service, creating a pending appointment.
- **FR-011**: System MUST require provider confirmation before an appointment is finalized.
- **FR-012**: System MUST prevent double-booking of the same provider time slot.
- **FR-013**: System MUST allow either party to cancel a confirmed appointment; cancellation MUST notify the other party.
- **FR-014**: System MUST allow either party to request rescheduling of a confirmed appointment with alternative time proposals.
- **FR-015**: System MUST send notifications for: invitation received, invitation accepted/declined, appointment requested, appointment confirmed, appointment cancelled, reschedule requested.
- **FR-016**: System MUST store all timestamps in UTC and display them in the user's local time zone.
- **FR-017**: System MUST enforce that every network has at least one administrator at all times.
- **FR-018**: System MUST display a dashboard summarizing the member's networks, upcoming appointments, and pending invitations.
- **FR-019**: System MUST prevent members from seeing services or members of networks they do not belong to.
- **FR-020**: System MUST allow service providers to edit or delete their own service listings.

### Key Entities

- **Network**: A named, invite-only group of companies and individuals. Key attributes: name, description, creation date. A network contains members and scopes service visibility.
- **Member**: A user (company or individual) who belongs to one or more networks. Key attributes: display name, email, member type (company/individual), role within each network (administrator/member).
- **Service**: An offering published by a member within a network. Key attributes: title, description, duration, optional location, provider (member). A service belongs to exactly one network.
- **Availability**: A provider's recurring or one-time schedule definition. Key attributes: day-of-week, start time, end time, blocked dates. Availability is owned by a member and applies across all their services.
- **Appointment**: A scheduled engagement between a requester and a provider for a specific service. Key attributes: date, start time, end time, status (pending/confirmed/cancelled/rescheduled), requester (member), provider (member), service.
- **Invitation**: A pending request for a user to join a network. Key attributes: invitee email, network, invited-by (member), status (pending/accepted/declined/expired), expiration date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a network and invite their first member in under 3 minutes.
- **SC-002**: A member can find and book a service appointment in under 5 minutes from opening the application.
- **SC-003**: 95% of booking requests receive provider confirmation or rejection within 24 hours (system-measured).
- **SC-004**: Zero double-bookings occur under concurrent usage of up to 500 simultaneous users.
- **SC-005**: 90% of users successfully complete their first end-to-end flow (create network → invite member → list service → book appointment) without external assistance.
- **SC-006**: System supports at least 100 networks, each with up to 200 members, without user-perceptible degradation.
- **SC-007**: All notification messages (invitation, confirmation, cancellation) are delivered within 2 minutes of the triggering action.
- **SC-008**: Dashboard loads within 3 seconds for a member who belongs to up to 10 networks with 50 upcoming appointments.
