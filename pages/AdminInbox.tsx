import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../services/authContext';
import { addTicketMessage, fetchAllTickets, markTicketReadByAdmin, updateTicketStatus } from '../services/dataService';
import { Ticket, TicketStatus, UserRole } from '../types';
import { formatDateStandard } from '../utils';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import TicketStatusBadge from '../components/TicketStatusBadge';
import { Inbox, MessageSquare } from 'lucide-react';
import Avatar from '../components/ui/Avatar';

type TicketFilter = 'all' | 'pending' | 'replied' | 'resolved' | 'closed';

const AdminInbox = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TicketFilter>('all');
  const [replyText, setReplyText] = useState('');

  const selectedTicket = useMemo(
    () => tickets.find(ticket => ticket.id === selectedTicketId) || null,
    [tickets, selectedTicketId]
  );
  const isClosed = selectedTicket?.status === 'Closed';

  const loadTickets = async () => {
    setLoading(true);
    const data = await fetchAllTickets();
    setTickets(data);
    if (!selectedTicketId && data.length > 0) {
      setSelectedTicketId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (!selectedTicket || selectedTicket.isReadByAdmin) return;
    markTicketReadByAdmin(selectedTicket.id).catch(() => undefined);
    setTickets(prev =>
      prev.map(ticket => ticket.id === selectedTicket.id ? { ...ticket, isReadByAdmin: true } : ticket)
    );
  }, [selectedTicket]);

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'pending') return ticket.status === 'Pending';
    if (filter === 'replied') return ticket.status === 'Replied';
    if (filter === 'resolved') return ticket.status === 'Resolved';
    if (filter === 'closed') return ticket.status === 'Closed';
    return true;
  });

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim() || !user) return;
    const messageText = replyText.trim();
    setReplyText('');
    const newMessageEntry = await addTicketMessage(
      selectedTicket.id,
      user.uid,
      UserRole.SUPER_ADMIN,
      messageText
    );
    setTickets(prev =>
      prev.map(ticket => {
        if (ticket.id !== selectedTicket.id) return ticket;
        return {
          ...ticket,
          messages: [...ticket.messages, newMessageEntry],
          updatedAt: Date.now(),
          isReadByUser: false,
          isReadByAdmin: true,
          status: 'Replied'
        };
      })
    );
  };

  const getSenderName = (role: UserRole.USER | UserRole.SUPER_ADMIN) =>
    role === UserRole.SUPER_ADMIN ? 'You' : selectedTicket?.userEmail || 'User';

  // Avatar handled by <Avatar /> (2-letter initials + deterministic colour)
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDateTime = (value: number) => {
    const date = new Date(value);
    return `${formatDateStandard(date)} ${formatTime(date)}`;
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selectedTicket) return;
    await updateTicketStatus(selectedTicket.id, status);
    setTickets(prev =>
      prev.map(ticket => ticket.id === selectedTicket.id
        ? { ...ticket, status, updatedAt: Date.now(), isReadByUser: false, isReadByAdmin: true }
        : ticket
      )
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Support Inbox
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage support tickets and respond to users.</p>
        </div>
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {(['all', 'pending', 'replied', 'resolved', 'closed'] as TicketFilter[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                filter === tab ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab === 'all'
                ? 'All'
                : tab === 'pending'
                ? 'Pending'
                : tab === 'replied'
                ? 'Replied'
                : tab === 'resolved'
                ? 'Resolved'
                : 'Closed'}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-gray-100 dark:border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tickets</h2>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No tickets in this view.</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTickets.map(ticket => (
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
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ticket.userEmail}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <TicketStatusBadge status={ticket.status} />
                          {!ticket.isReadByAdmin && (
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedTicket.userEmail} · {selectedTicket.type}</p>
                  </div>
                  <TicketStatusBadge status={selectedTicket.status} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => handleStatusChange('Resolved')}>
                    Mark Resolved
                  </Button>
                  <Button variant="secondary" onClick={() => handleStatusChange('Closed')}>
                    Close Ticket
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {selectedTicket.messages.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No messages yet.</p>
                ) : (
                  selectedTicket.messages.map((message, index) => {
                    const isAdmin = message.senderRole === UserRole.SUPER_ADMIN;
                    const senderName = getSenderName(message.senderRole);
                    const isFirst = index === 0;
                    return (
                      <div
                        key={message.id}
                        className={`border rounded-xl p-4 sm:p-5 ${
                          isFirst
                            ? 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-700 dark:bg-indigo-900/20'
                            : isAdmin
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
                    placeholder={isClosed ? 'This ticket is closed.' : 'Reply to the user...'}
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
    </div>
  );
};

export default AdminInbox;
