import { describe, expect, it } from 'vitest';
import { groupChats } from './Chats';
import type { LiveChat } from '../../../shared/protocol';

const chat = (id: string, cwd: string, lastActive: number) => ({ id, cwd, lastActive, sessionId: null, title: 'New chat', running: false, pending: 0 }) as unknown as LiveChat;

describe('groupChats', () => {
  it('puts every chat without a file in one group', () => {
    const live = [chat('a', '/h/DesignView/chat-20261018-092121', 3), chat('b', '/h/DesignView/chat-20261018-093356', 2), chat('c', '/h/DesignView/scratch', 1)];
    const groups = groupChats(live, [], []);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ cwd: '', name: 'No file yet' });
    expect(groups[0].open.map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps a chat folder with an attached file as its own group', () => {
    const dir = '/h/DesignView/chat-20261018-092121';
    const groups = groupChats([chat('a', dir, 1)], [], [{ cwd: dir, key: 'k', name: 'Cart', url: 'u' }]);
    expect(groups[0]).toMatchObject({ cwd: dir, name: 'Cart' });
  });
});
