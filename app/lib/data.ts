import fixtureTweets from "../../data/fixture-tweets.json";

// Keep the UI data source in one place; switch this import when published data is ready.
export const tweets = fixtureTweets;
export type TweetRecord = (typeof tweets)[number];
