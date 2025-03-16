Overview
This repository contains my solution attempt for the Altera take-home technical challenge. While I didn't fully achieve the end goal of creating a Chrome DevTools Recorder, this ReadMe documents my approach, what I learned, and how I would proceed given more time.
The Challenge
1. A chrome extension that captures user actions on a Chrome browser and allows users to download action traces.
2. A script that takes in the recorded action trace and replays the same sequence of actions on a browser.
3. The recorded action trace of the following flow:
i. Navigate to https://chatgpt.com
ii. Engage in a multiround conversation with ChatGPT. Use Search mode for at least one of the queries.
My Approach
Initial Strategy:
I began by sectioning it off into four integrated programs: ActionTrackingRecorder, EventStreamCollector, EventStreamPlayer, EventStreamWriter. My thought process was that these would be abstracted code that all worked together to collect, write, playback, and coordinate between all three.Technologies Used

[JavaScript]: since JS is usually used for interaction of cursor with window

What Worked Well

[Achievement 1]: I successfully was able to navigate to chatgpt.com and start interacting with the website. 
[Achievement 2]: Clicks were successfully registered using DOM. 
[Achievement 3]: I was able to debug some initial issues using console logs. 

Challenges Encountered
During development, I faced several interesting challenges:

[Challenge 1]: The clicks were registering, but they weren't being written to the log, which is what I'm currently researching more on. 
[Challenge 2]: Chatgpt website that opened was limited/didn't get past the first query. 

Key Learnings
This challenge provided valuable experience with:

[Learning 1] - I gained deeper understanding of how to integrate different javascript pages together to generate a popup response to chatgpt.
[Learning 2] - Utilize DOM click action and responses -- will look into continuing to use this for expanding this project to register scrolls, etc.
[Learning 3] - Whittling down where the issue occurred with console log prints. 

Next Steps
If I were to continue working on this challenge, I would:

First figure out and fix the challenges that occured. 
Implement extensions like scroll, drag and click, etc. 
Refactor code with more comments and how it connects with other parts of the program. 
Make it more user-friendly by adding a user interface to interact with the action tracker. 

Running the Project
cd path/to/chatgpt-action-logger
npm install puppeteer
node track-chatgpt.js

Conclusion
While I didn't fully achieve the end goal, this challenge was an excellent opportunity to explore Javascript and programming. I'm excited to discuss my approach and the skills I learned through this project. 
I welcome any feedback on my solution approach and would be particularly interested in learning about alternative strategies that might have been more effective.
