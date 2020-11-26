-- Up
CREATE TABLE Posts (
  id INTEGER PRIMARY KEY,
  postText STRING,
  authorId INTEGER,
  dateTime STRING,
  FOREIGN KEY (authorId) REFERENCES Users (id)
  );

CREATE TABLE Users (
  id INTEGER PRIMARY KEY,
  email STRING,
  password STRING,
  username STRING
);

CREATE TABLE AccessTokens (
  id INTEGER PRIMARY KEY,
  userId INTEGER,
  token STRING,
  FOREIGN KEY (userId) REFERENCES Users (id)
);

-- Down
DROP TABLE Posts;
DROP TABLE Users;
DROP TABLE AccessTokens;