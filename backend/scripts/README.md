# Database Seeding Scripts

## Available Scripts

### 1. Test Database Connection
Test the MongoDB connection and display database information:
```bash
npm run test-db
```
or
```bash
node scripts/test-connection.js
```

This will:
- Test MongoDB connectivity
- Display database information
- List all collections
- Show document counts

### 2. Seed Database
Populate the database with dummy data:
```bash
npm run seed
```
or
```bash
node scripts/seed.js
```

## What Gets Seeded

The seed script creates:

### Users
- **1 User**:
  - Admin: `admin@hrms.com` / `admin123`

**Note**: Only the admin account is created by default. You can create HR and employee accounts later through the application.

**Note**: Organizational data (branches, departments, designations, shifts, leave types, salary components) are not created by default. You can create these through the application after logging in as admin.

## Important Notes

1. **Clearing Existing Data**: By default, the seed script does NOT clear existing data. If you want to clear existing data before seeding, uncomment the `clearDatabase()` call in `seed.js`.

2. **Password Security**: The seed script creates users with simple passwords for development. Change these in production!

3. **Database Connection**: Make sure your `.env` file has the correct `MONGODB_URI` before running the seed script.

## Troubleshooting

### Connection Issues
- Verify MongoDB URI in `.env` file
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure network connectivity

### Duplicate Key Errors
- The script will fail if data already exists with the same unique fields
- Use `clearDatabase()` to remove existing data first (uncomment in seed.js)

### Missing Dependencies
- Run `npm install` in the backend directory first

## Usage Example

```bash
# 1. Test connection first
npm run test-db

# 2. If connection successful, seed the database
npm run seed

# 3. Start the server
npm run dev
```

## After Seeding

You can now:
1. Login with `admin@hrms.com` / `admin123`
2. Create organizational data (branches, departments, designations, shifts, leave types, salary components) through the application
3. Create HR and employee accounts through the application
4. Test all HRMS features with real data
5. Create attendance records, leave requests, etc.
