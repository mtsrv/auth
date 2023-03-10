-- Migration number: 0000 	 2023-03-08T18:31:43.802Z

drop table if exists `users`;

create table if not exists `users` (
  `userID` integer primary key autoincrement not null,
  `userName` text unique not null,
  `userChallenge` text
);
