#!/bin/bash
# Script to check user details by email
# Usage: ./check_user.sh <email>

EMAIL="${1:-parkkavi.22@cse.mrt.ac.lk}"

echo "Checking user: $EMAIL"
echo ""

# Get API key from localStorage (you'll need to provide it manually or get it from browser)
# For now, this is a helper script - you'll need to provide your admin API key

echo "To check this user, you can:"
echo "1. Use the admin panel at /admin/users"
echo "2. Call the API endpoint: GET /api/admin/users/lookup?email=$EMAIL"
echo "3. Or run this query in Supabase SQL Editor:"
echo ""
echo "SELECT * FROM users WHERE email = '$EMAIL';"
echo ""
echo "To get more details, run:"
echo "SELECT u.*, COUNT(if.id) as indices_count, COUNT(ij.id) as jobs_count"
echo "FROM users u"
echo "LEFT JOIN index_files if ON if.user_id = u.id"
echo "LEFT JOIN index_jobs ij ON ij.user_id = u.id"
echo "WHERE u.email = '$EMAIL'"
echo "GROUP BY u.id;"
