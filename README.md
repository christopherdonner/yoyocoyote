# yoyocoyte

https://yoyocoyote.ca/

NodeJS, ExpressJS, MySQL, and the Google Maps API 

YoYoCoyote is a crowd sourced wild-life tracking platform.
with the ever increasing presence of coyotes in urban areas in the region of Waterloo, YoYoCoyote aims to map and track reported sightings in the area.
Collectively, we can accurately track movement of coyotes in the region for conservation, education and safety for humans and coyotes alike.
Coyote sightings can be reported from phones, via yoyocoyte.ca, using location services or retroactively on a computer or tablet.
Information collected here will be shared with the Region of Waterloo, the University of Waterloo, Wilfred Laurier University and the University of Guelph.
Mobile:
![image](https://github.com/user-attachments/assets/c441fa69-dd15-4a6b-b4cc-867ddffd9dc7)


Desktop:
![image](https://github.com/user-attachments/assets/2f7e9f05-3066-4971-a33b-48465b3bbf83)

## Accounts and reports

Run the one-time authentication migration against the existing database before starting the updated app:

```text
mysql -u root -p coyote_db < db/auth_migration.sql
```

The migration creates `app_users` and `auth_sessions` without dropping the database or existing coyote reports. Existing `userid` values are cleared because they were not linked to authenticated accounts.

Users can create an account at `/signup`, log in at `/login`, and view their own reports at `/reports`. Passwords are stored as scrypt hashes, and login sessions are stored in MySQL. Passwords must be at least 12 characters.

When logged in, users can drag the pins for their own active reports on the map to correct their locations. The updated coordinates are saved immediately; reports from other users and guest reports cannot be moved by that account.

Reporting a coyote does not require an account. Guest reports are saved with a null user ID; reports submitted while logged in are associated with that account.

The app uses secure cookies by default. For local HTTP-only development, set `COOKIE_SECURE=false`; keep it enabled when requests come through HTTPS in NGINX.

### Admin report management

Run the admin migration after the authentication migration:

```text
mysql -u root -p coyote_db < db/admin_migration.sql
```

Grant admin access only to an existing trusted account. In a MySQL prompt, substitute that account's exact username:

```sql
INSERT INTO app_admins (user_id)
SELECT id FROM app_users WHERE username = 'YOUR_USERNAME';
```

Administrators see an **Admin** link on the map and can review all reports at `/admin/reports`, including reporter, time, notes, status, and submitted photos. Deleting a report permanently removes its database row and photo. Ordinary accounts receive a 403 response if they try to open the admin page.

## Coyote report details and photos

Run the report-photo migration once against the existing database:

```text
mysql -u root -p coyote_db < db/report_photo_migration.sql
```

Selecting **Report a coyote** first requests the visitor's location, then opens a form for optional details and a photo. A photo can be captured directly if a camera is available and permission is granted, or selected from an existing image file. Reports can still be submitted without a photo. The browser resizes images and encodes them as JPEG before submission. The server accepts JPEG data up to 3 MB and stores the binary image in MySQL.


