from sqlalchemy import ForeignKey, Table, Column, Integer, String
from sqlalchemy.orm import relationship
from ..config.database import Base


game_room_players = Table("game_room_players", Base.metadata, Column("game_room_id", ForeignKey("gamerooms.id"), primary_key = True), Column("player_id", ForeignKey("players.id"), primary_key = True))


class Player(Base):
    __tablename__ = "players"
    id = Column(String, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    password_hash = Column(String)
    game_rooms = relationship(
        "GameRoom",
        secondary= game_room_players,
        back_populates= "members"
    )

class GameRoom(Base):
    __tablename__ = "gamerooms"
    id = Column(String, primary_key=True)
    members = relationship(
        "Player",
        secondary= game_room_players,
        back_populates= "game_rooms"
    )
