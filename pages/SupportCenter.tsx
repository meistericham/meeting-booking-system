import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/authContext';
import { addTicketMessage, createTicket, fetchUserTickets, markTicketReadByUser, updateTicketStatusByUser } from '../services/dataService';
import { Ticket, TicketType, UserRole } from '../types';
import { formatDateStandard } from '../utils';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import TicketStatusBadge from '../components/TicketStatusBadge';
import { LifeBuoy, MessageSquare, Plus } from 'lucide-react';
import Avatar from '../components/ui/Avatar';

const ticketTypes: TicketType[] = ['Feedback', 'Enquiry', 'Bug'];

const SupportCenter = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newType, setNewType] = useState<TicketType>('Enquiry');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTicket = useMemo(
    () => tickets.find(ticket => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );
  const isClosed = selectedTicket?.status === 'Closed';

  const loadTickets = async () => {
    if (!user) return;
    setLoading(true);
    const data = await fetchUserTickets(user.uid);
    setTickets(data);
    if (!selectedTicketId && data.length > 0) {
      setSelectedTicketId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedTicket || selectedTicket.isReadByUser) return;
    markTicketReadByUser(selectedTicket.id).catch(() => undefined);
    setTickets(prev =>
      prev.map(ticket => ticket.id === selectedTicket.id ? { ...ticket, isReadByUser: true } : ticket)
    );
  }, [selectedTicket, user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSubject.trim() || !newMessage.trim()) return;
    setIsSubmitting(true);
    try {
      const userRole = user.role === UserRole.ADMIN ? UserRole.ADMIN : UserRole.USER;
      const ticketId = await createTicket({
        uid: user.uid,
        userEmail: user.email,
        userRole,
        type: newType,
        subject: newSubject.trim(),
        message: newMessage.trim()
      });
      await loadTickets();
      setSelectedTicketId(ticketId);
      setNewSubject('');
      setNewMessage('');
      setNewType('Enquiry');
      setShowCreateModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!user || !selectedTicket || !replyText.trim()) return;
    const messageText = replyText.trim();
    setReplyText('');
    const newMessageEntry = await addTicketMessage(
      selectedTicket.id,
      user.uid,
      UserRole.USER,
      messageText
    );
    setTickets(prev =>
      prev.map(ticket => {
        if (ticket.id !== selectedTicket.id) return ticket;
        return {
          ...ticket,
          messages: [...ticket.messages, newMessageEntry],
          updatedAt: Date.now(),
          isReadByAdmin: false,
          isReadByUser: true,
          status: 'Pending'
        };
      })
    );
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    await updateTicketStatusByUser(selectedTicket.id, 'Closed');
    setTickets(prev =>
      prev.map(ticket => ticket.id === selectedTicket.id
        ? { ...ticket, status: 'Closed', updatedAt: Date.now(), isReadByAdmin: false, isReadByUser: true }
        : ticket
      )
    );
  };

  const getSenderName = (role: UserRole.USER | UserRole.SUPER_ADMIN) =>
    role === UserRole.USER ? 'You' : 'Support Team';

  // Avatar handled by <Avatar /> (2-letter initials + deterministic colour)
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (value: number) => {
    const date = new Date(value);
    return `${formatDateStandard(date)} ${formatTime(date)}`;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Help & Support
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Create a ticket or continue the conversation with our team.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} icon={<Plus className="w-4 h-4" />}>
          New Ticket
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">My Tickets</h2>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No tickets yet.</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {tickets.map(ticket => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(ticket.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedTicketId === ticket.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ticket.subject}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ticket.type}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <TicketStatusBadge status={ticket.status} />
                          {!ticket.isReadByUser && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Updated {formatDateTime(ticket.updatedAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="flex flex-col">
          {!selectedTicket ? (
            <div className="flex flex-col items-center justify-center text-center py-16 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-10 h-10 mb-3 text-gray-400" />
              <p>Select a ticket to view the conversation.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 dark:border-gray-800 pb-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedTicket.type} · {selectedTicket.userEmail}</p>
                  </div>
                  <TicketStatusBadge status={selectedTicket.status} />
                </div>
                {selectedTicket.status !== 'Closed' && (
                  <div>
                    <Button variant="secondary" onClick={handleCloseTicket}>
                      Close Ticket
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {selectedTicket.messages.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</p>
                ) : (
                  selectedTicket.messages.map((message, index) => {
                    const isSupport = message.senderRole === UserRole.SUPER_ADMIN;
                    const senderName = getSenderName(message.senderRole);
                    const isFirst = index === 0;
                    return (
                      <div
                        key={message.id}
                        className={`border rounded-xl p-4 sm:p-5 ${
                          isFirst
                            ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-900/20'
                            : isSupport
                            ? 'border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                        }`}
                      >
                        {isFirst && (
                          <div className="mb-3">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                              {selectedTicket.subject}
                            </h4>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar displayName={senderName} email={senderName} size="md" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{senderName}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                          {message.text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Post a Reply</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                    rows={4}
                    placeholder={isClosed ? 'This ticket is closed.' : 'Write your response...'}
                    disabled={isClosed}
                  />
                  <Button onClick={handleSendReply} className="self-end" disabled={isClosed}>
                    Post Reply
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Support Ticket">
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Brief summary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as TicketType)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {ticketTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              rows={4}
              placeholder="Describe your issue or feedback"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SupportCenter;
