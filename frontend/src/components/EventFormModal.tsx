import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from './ui';
import { useToast } from './toast';
import { apiRequest, errorMessage } from '../lib/api';
import {
  CPC_EVENT_CATEGORIES,
  CPC_ORGANIZATIONS,
} from '../lib/cpc';
import { toDateTimeInput } from '../lib/format';
import type { CampusEvent, EventStatus } from '../lib/types';

type FormState = {
  title: string;
  description: string;
  category: string;
  organization: string;
  venue: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  capacity: string;
  registrationDeadline: string;
  status: EventStatus;
};

function dateInputOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    title: '',
    description: '',
    category: 'Academic',
    organization: CPC_ORGANIZATIONS[0],
    venue: '',
    eventDate: dateInputOffset(7),
    startTime: '08:00',
    endTime: '12:00',
    capacity: '100',
    registrationDeadline: `${dateInputOffset(5)}T23:59`,
    status: 'draft',
  };
}

function formFromEvent(event: CampusEvent): FormState {
  return {
    title: event.title,
    description: event.description,
    category: event.category,
    organization: event.organization,
    venue: event.venue,
    eventDate: toDateTimeInput(event.eventDate).slice(0, 10),
    startTime: event.startTime,
    endTime: event.endTime,
    capacity: String(event.capacity),
    registrationDeadline: toDateTimeInput(event.registrationDeadline),
    status: event.status,
  };
}

export function EventFormModal({
  open,
  event,
  onClose,
  onSaved,
}: {
  open: boolean;
  event: CampusEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(event ? formFromEvent(event) : emptyForm());
    setError(null);
  }, [open, event]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setError(null);

    if (form.title.trim().length < 3) {
      setError('Event title must be at least 3 characters.');
      return;
    }
    if (form.description.trim().length < 10) {
      setError('Event description must be at least 10 characters.');
      return;
    }
    if (!form.venue.trim()) {
      setError('Event venue is required.');
      return;
    }
    if (!form.eventDate) {
      setError('Please choose the event date.');
      return;
    }
    if (!form.registrationDeadline) {
      setError('Please choose the registration deadline.');
      return;
    }
    if (form.endTime <= form.startTime) {
      setError('End time must be later than start time.');
      return;
    }
    if (new Date(form.registrationDeadline).getTime() > new Date(form.eventDate).getTime()) {
      setError('The registration deadline must be on or before the event date.');
      return;
    }
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      setError('Capacity must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        venue: form.venue.trim(),
        capacity,
      };

      await apiRequest(event ? `/events/${event.id}` : '/events', {
        method: event ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });

      toast(event ? 'Event updated successfully.' : 'Event created successfully.');
      onSaved();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? 'Edit CPC event' : 'Create a CPC event'}
      description="All events must be hosted by a recognized Cordova Public College organization."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="event-form" loading={submitting}>
            {event ? 'Save changes' : 'Create event'}
          </Button>
        </>
      }
    >
      <form id="event-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Event title" htmlFor="title" required>
          <Input
            id="title"
            placeholder="CPC Foundation Day 2026"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </Field>

        <Field label="Description" htmlFor="description" required>
          <Textarea
            id="description"
            rows={4}
            placeholder="Describe what students can expect from this CPC event…"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="category" required>
            <Select
              id="category"
              value={form.category}
              onChange={(e) => update('category', e.target.value)}
            >
              {CPC_EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Organizing CPC office" htmlFor="organization" required>
            <Select
              id="organization"
              value={form.organization}
              onChange={(e) => update('organization', e.target.value)}
            >
              {CPC_ORGANIZATIONS.map((organization) => (
                <option key={organization} value={organization}>
                  {organization}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Venue" htmlFor="venue" required>
          <Input
            id="venue"
            placeholder="CPC Auditorium"
            value={form.venue}
            onChange={(e) => update('venue', e.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Event date" htmlFor="eventDate" required>
            <Input
              id="eventDate"
              type="date"
              value={form.eventDate}
              onChange={(e) => update('eventDate', e.target.value)}
            />
          </Field>

          <Field label="Start time" htmlFor="startTime" required>
            <Input
              id="startTime"
              type="time"
              value={form.startTime}
              onChange={(e) => update('startTime', e.target.value)}
            />
          </Field>

          <Field label="End time" htmlFor="endTime" required>
            <Input
              id="endTime"
              type="time"
              value={form.endTime}
              onChange={(e) => update('endTime', e.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Capacity" htmlFor="capacity" required hint="Maximum number of students">
            <Input
              id="capacity"
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => update('capacity', e.target.value)}
            />
          </Field>

          <Field label="Registration deadline" htmlFor="registrationDeadline" required>
            <Input
              id="registrationDeadline"
              type="datetime-local"
              value={form.registrationDeadline}
              onChange={(e) => update('registrationDeadline', e.target.value)}
            />
          </Field>
        </div>

        <Field label="Visibility status" htmlFor="status" required>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => update('status', e.target.value as EventStatus)}
          >
            <option value="draft">Draft — only organizers can see it</option>
            <option value="published">Published — open to CPC students</option>
            <option value="cancelled">Cancelled — no longer accepting sign-ups</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
