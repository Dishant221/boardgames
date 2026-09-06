import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function Game() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { currentSession, isLoading, getSession, clearCurrentSession } = useGameStore();

  useEffect(() => {
    if (sessionId) {
      getSession(sessionId);
    }

    return () => {
      clearCurrentSession();
    };
  }, [sessionId, getSession, clearCurrentSession]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Game not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="button-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 to-orange-100">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">
            {currentSession.game_type.toUpperCase()}
          </h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="button-secondary text-primary"
          >
            Back to Lobby
          </button>
        </div>
      </header>

      {/* Game Container */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Game Status */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-primary">Game Status</h2>
              <span className={`px-4 py-2 rounded-lg font-bold ${
                currentSession.status === 'waiting' ? 'bg-yellow-200 text-yellow-800' :
                currentSession.status === 'playing' ? 'bg-green-200 text-green-800' :
                'bg-gray-200 text-gray-800'
              }`}>
                {currentSession.status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Players Section */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-4">Players ({currentSession.players.length}/4)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {currentSession.players.map((player: any) => (
                <div
                  key={player.userId}
                  className="border-2 rounded-lg p-4"
                  style={{ borderColor: player.color }}
                >
                  <div
                    className="w-8 h-8 rounded-full mb-2"
                    style={{ backgroundColor: player.color }}
                  />
                  <p className="font-bold text-sm">{player.username}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    ${player.money.toLocaleString()}
                  </p>
                  <p className={`text-xs font-bold mt-1 ${
                    player.status === 'active' ? 'text-green-600' :
                    player.status === 'bankrupt' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {player.status.toUpperCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Game Board Placeholder */}
          <div className="bg-amber-50 border-4 border-primary rounded-lg p-8 aspect-square max-w-2xl mx-auto">
            <div className="flex items-center justify-center h-full text-gray-600 text-center">
              <div>
                <p className="text-lg font-bold mb-2">Monopoly Board</p>
                <p className="text-sm">Game board rendering coming soon</p>
              </div>
            </div>
          </div>

          {/* Wait for Players Message */}
          {currentSession.status === 'waiting' && currentSession.players.length < 2 && (
            <div className="mt-8 bg-blue-100 border border-blue-400 rounded-lg p-4 text-center">
              <p className="text-blue-800 font-bold">
                Waiting for more players to join... ({currentSession.players.length}/2 minimum needed)
              </p>
            </div>
          )}

          {/* Start Game Button */}
          {currentSession.status === 'waiting' && currentSession.players.length >= 2 && (
            <div className="mt-8 text-center">
              <button className="button-primary bg-green-600 hover:bg-green-700 text-lg px-8 py-3">
                Start Game
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
