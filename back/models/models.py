import uuid
from sqlalchemy import DateTime, ForeignKey, Table, Column, Integer, String
from sqlalchemy.orm import relationship
from config.database import Base


game_room_players = Table("game_room_players", Base.metadata, Column("game_room_id", ForeignKey("gamerooms.id"), primary_key = True), Column("player_id", ForeignKey("players.id"), primary_key = True))


class Player(Base):
    __tablename__ = "players"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String)
    email = Column(String, unique=True)
    password_hash = Column(String, nullable=True)
    appwrite_id = Column(String, unique=True, nullable=True)

    game_rooms = relationship(
        "GameRoom",
        secondary= game_room_players,
        back_populates= "members"
    )
    spotify_connection = relationship(
        "SpotifyConnection",
        back_populates="player",
        uselist=False,
        cascade="all, delete-orphan"
    )


class SpotifyConnection(Base):
    __tablename__ = "spotify_connections"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("players.id"), unique=True)

    spotify_user_id = Column(String, unique=True, nullable=False)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    player = relationship(
        "Player",
        back_populates="spotify_connection"
    )
class GameRoom(Base):
    __tablename__ = "gamerooms"
    id = Column(String, primary_key=True, default= lambda: str(uuid.uuid4()))
    members = relationship(
        "Player",
        secondary= game_room_players,
        back_populates= "game_rooms"
    )
class SpotifyOAuthState(Base):
    __tablename__ = "spotify_oauth_states"

    state = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("players.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)