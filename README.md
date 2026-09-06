# My Private Hosting v4

פאנל Hosting פרטי לשימוש אישי.

## התקנה

1. פתח PowerShell בתוך התיקייה.
2. הרץ:

npm install

3. צור קובץ בשם `.env` לפי `.env.example`.

דוגמה:

PORT=3000
PANEL_USERNAME=ron
PANEL_PASSWORD=הסיסמה_שלך
SESSION_SECRET=מחרוזת_ארוכה_ואקראית

4. הפעל:

npm start

5. פתח:

http://localhost:3000

## סוגי פרויקטים

- Discord Bot
- Website
- Script

## Runtimes

- Node.js
- Python
- Java
- PHP
- Ruby
- Lua
- Shell

## חשוב

המערכת מיועדת כרגע לפאנל פרטי. היא מריצה קוד ישירות על המחשב/שרת ולכן לא כדאי לחשוף אותה לאינטרנט לפני שמוסיפים בידוד כמו Docker, הגבלת משאבים ו-HTTPS.

האימות משתמש ב-express-session. Restart של השרת ינתק את המשתמש מהפאנל, אבל לא מוחק את הפרויקטים.


## v4 – שיפורי Logs

בגרסה הזו:
- שמות קבצים כמו `index.js`, `bot.js`, `main.py` נשמרים עם הנקודה.
- לפני הפעלה נבדק שקובץ ה-Entry באמת קיים.
- ה-Logs מציגים את הפקודה שהופעלה, תיקיית העבודה, STDOUT ו-STDERR.
- אם התהליך קורס, נשמרים Exit Code, Signal וזמן הריצה.
- אם Node/Python וכו' לא מצליחים להיפתח, נשמר Process Error.
- יש Auto Restart לפרויקטים שהוגדרו לכך.
- אפשר לנקות Logs מהפאנל.
