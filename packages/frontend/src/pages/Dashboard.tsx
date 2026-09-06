import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useGameStore, type GamePlayer } from '../store/gameStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sessions, isLoading, fetchSessions, createSession } = useGameStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(4);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateGame = async () => {
    try {
      const sessionId = await createSession('monopoly', maxPlayers);
      navigate(`/game/${sessionId}`);
    } catch {
      // Error handled in store
    }
  };

  const handleJoinGame = (sessionId: string) => {
    navigate(`/game/${sessionId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">BoardGamesEpic</h1>
            <p className="text-amber-100">Welcome, {user?.username}!</p>
          </div>
          <button
            onClick={logout}
            className="button-secondary bg-white text-primary hover:bg-amber-100"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Game Section */}
        <div className="mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="button-primary bg-green-600 hover:bg-green-700 text-lg"
          >
            + Create New Game
          </button>
        </div>

        {/* Create Game Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Game Type
                  </label>
                  <select className="input-field">
                    <option>Monopoly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Max Players: {maxPlayers}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="4"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleCreateGame}
                    className="button-primary flex-1"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="button-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Games */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-primary">Available Games</h2>

          {isLoading ? (
            <div className="text-center text-gray-600">Loading games...</div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No games available yet.</p>
              <p>Create one to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="property-card cursor-pointer hover:scale-105 transform"
                  onClick={() => handleJoinGame(session.id)}
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-primary mb-2">
                      {session.game_type.charAt(0).toUpperCase() + session.game_type.slice(1)}
                    </h3>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Players: {session.players.length}/4</span>
                      <span className={`font-bold ${
                        session.status === 'waiting' ? 'text-green-600' :
                        session.status === 'playing' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Created {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-gray-100 rounded p-2 mb-4">
                    <p className="text-xs font-bold text-gray-700">Players:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {session.players.map((player: GamePlayer) => (
                        <span
                          key={player.userId}
                          className={`inline-block w-3 h-3 rounded-full`}
                          style={{ backgroundColor: player.color }}
                          title={player.username}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    className="button-primary w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGame(session.id);
                    }}
                  >
                    Join Game
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
