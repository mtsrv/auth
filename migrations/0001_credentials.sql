-- Migration number: 0001 	 2023-03-09T07:57:32.963Z

drop table if exists `credentials`;

create table if not exists `credentials` (
  `userID` integer not null,
  `credentialID` text not null,
  `credentialPublicKey` text not null,
  `credentialCounter` text not null,
  foreign key (`userID`) references `users` (`userID`)
);
