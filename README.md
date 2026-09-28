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

Reporting a coyote does not require an account. Guest reports are saved with a null user ID; reports submitted while logged in are associated with that account.

The app uses secure cookies by default. For local HTTP-only development, set `COOKIE_SECURE=false`; keep it enabled when requests come through HTTPS in NGINX.

## Coyote report details and photos

Run the report-photo migration once against the existing database:

```text
mysql -u root -p coyote_db < db/report_photo_migration.sql
```

Selecting **Report a coyote** first requests the visitor's location, then opens a form for optional details and a photo. On supported devices, the photo control can open the camera; otherwise it opens the available image picker. The browser resizes the image and encodes it as JPEG before submission. Reports are saved together with their coordinates, details, and optional photo. The server accepts JPEG data up to 3 MB and stores the binary image in MySQL.


