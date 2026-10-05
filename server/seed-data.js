import bcrypt from 'bcryptjs';
import { User, Item, Claim, Notification, Recovery } from './models.js';

export async function seedDemoData() {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed data is disabled in production.');

  const studentEmail = (process.env.DEMO_STUDENT_EMAIL || 'student@example.com').toLowerCase();
  const adminEmail = (process.env.DEMO_ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const studentPassword = process.env.DEMO_STUDENT_PASSWORD || 'Student@123';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'Admin@123';

  let student = await User.findOne({ email: studentEmail });
  if (!student) {
    student = await User.create({
      name: 'Aarav Mehta', email: studentEmail, password: await bcrypt.hash(studentPassword, 12),
      phone: '+91 98765 43210', department: 'Computer Science', role: 'user',
    });
  }
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    admin = await User.create({
      name: 'Campus Administrator', email: adminEmail, password: await bcrypt.hash(adminPassword, 12),
      phone: '+91 90000 00000', department: 'Student Services', role: 'admin',
    });
  }

  if (await Item.countDocuments() === 0) {
    const day = (daysAgo) => new Date(Date.now() - daysAgo * 86_400_000);
    const examples = [
      { type: 'Lost', name: 'iPhone 14', category: 'Mobile Phones', description: 'Midnight black iPhone with a clear case and a small sticker inside.', brand: 'Apple', color: 'Black', location: 'Central Library, second floor', daysAgo: 2, status: 'Active', verificationStatus: 'verified', image: '/images/samples/wallet-keys-phone.jpg' },
      { type: 'Found', name: 'Samsung Galaxy S23', category: 'Mobile Phones', description: 'Blue phone found near the main auditorium entrance.', brand: 'Samsung', color: 'Blue', location: 'Main Auditorium', daysAgo: 1, status: 'Active', verificationStatus: 'verified', image: '/images/samples/lost-found-table.jpg' },
      { type: 'Lost', name: 'HP laptop charger', category: 'Electronics', description: '65W HP charger with a black cable; may have been left by the engineering lab.', brand: 'HP', color: 'Black', location: 'Engineering Block, Lab 3', daysAgo: 3, status: 'Matched', verificationStatus: 'verified', image: '' },
      { type: 'Found', name: 'College ID card', category: 'ID Cards', description: 'Student ID card found on the steps outside the canteen. Owner can verify the printed details.', brand: 'Campus', color: 'Blue and white', location: 'Student Canteen', daysAgo: 0, status: 'Under Review', verificationStatus: 'pending', image: '' },
      { type: 'Found', name: 'Black leather wallet', category: 'Wallets', description: 'Compact wallet with a brass snap. Owner should identify the contents.', brand: '', color: 'Black', location: 'Sports Complex lockers', daysAgo: 4, status: 'Active', verificationStatus: 'verified', image: '/images/samples/wallet-keys-phone.jpg' },
      { type: 'Lost', name: 'Scientific calculator', category: 'Electronics', description: 'Casio fx-991EX with the initials A.M. written inside the cover.', brand: 'Casio', color: 'Black', location: 'Mathematics Lecture Hall', daysAgo: 6, status: 'Active', verificationStatus: 'verified', image: '' },
      { type: 'Found', name: 'JBL Bluetooth earbuds', category: 'Accessories', description: 'Black JBL earbuds in their charging case, found beside the library study pods.', brand: 'JBL', color: 'Black', location: 'Central Library study pods', daysAgo: 2, status: 'Matched', verificationStatus: 'verified', image: '/images/samples/earbuds-wallet.jpg' },
      { type: 'Lost', name: 'Purple campus backpack', category: 'Bags', description: 'Purple backpack with a small embroidered mountain patch and a blue keychain.', brand: 'JanSport', color: 'Purple', location: 'North Campus shuttle stop', daysAgo: 1, status: 'Active', verificationStatus: 'verified', image: '/images/samples/campus-essentials.jpg' },
      { type: 'Found', name: 'Blue water bottle', category: 'Accessories', description: 'Light blue insulated bottle with a flip straw lid.', brand: '', color: 'Light blue', location: 'Student Centre, room 204', daysAgo: 5, status: 'Active', verificationStatus: 'verified', image: '/images/samples/water-bottle.png' },
      { type: 'Lost', name: 'Engineering mathematics textbook', category: 'Books', description: 'Fourth edition textbook with handwritten notes on the inside cover.', brand: 'Pearson', color: 'White and blue', location: 'Engineering Block common room', daysAgo: 8, status: 'Recovered', verificationStatus: 'verified', image: '/images/samples/campus-essentials.jpg' },
      { type: 'Found', name: 'Silver smartwatch', category: 'Watches', description: 'Silver smartwatch with a dark green band, found near the basketball courts.', brand: 'Amazfit', color: 'Silver and green', location: 'Outdoor Basketball Court', daysAgo: 3, status: 'Active', verificationStatus: 'verified', image: '' },
      { type: 'Lost', name: 'USB flash drive', category: 'Electronics', description: 'Small red 64GB USB drive with a plain metal cap.', brand: 'SanDisk', color: 'Red', location: 'Computer Lab 2', daysAgo: 9, status: 'Closed', verificationStatus: 'verified', image: '' },
    ];
    const created = await Item.insertMany(examples.map(({ daysAgo, ...entry }) => ({
      userId: entry.name === 'Black leather wallet' ? admin._id : student._id,
      type: entry.type,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      brand: entry.brand,
      color: entry.color,
      location: entry.location,
      date: day(daysAgo),
      time: '',
      identifyingFeatures: '',
      image: entry.image,
      contactPreference: 'In-app',
      status: entry.status,
      verificationStatus: entry.verificationStatus,
    })));

    const foundWallet = created.find((item) => item.name === 'Black leather wallet');
    if (foundWallet) {
      const claim = await Claim.create({
        itemId: foundWallet._id,
        claimantId: student._id,
        description: 'I believe this is my wallet; it has been missing since leaving the sports complex.',
        identifyingInformation: 'There is a folded library receipt tucked in the inner pocket.',
        additionalDescription: 'I can describe the remaining contents during verification.',
        contactInformation: student.email,
        status: 'Pending',
      });
      await Notification.create({
        userId: student._id, title: 'Claim submitted',
        message: `Your claim ${claim.claimId} is waiting for campus verification.`,
        type: 'claim', referenceId: claim._id,
      });
      await Notification.create({
        userId: admin._id, title: 'A claim needs review',
        message: `A campus member submitted a claim for found report ${foundWallet.reportId}.`,
        type: 'claim', referenceId: claim._id,
      });
    }
    const recovered = created.find((item) => item.status === 'Recovered');
    if (recovered) {
      await Recovery.create({ itemId: recovered._id, userId: student._id, recoveredDate: day(1), status: 'Recovered' });
      await Notification.create({
        userId: student._id, title: 'Item reunited',
        message: 'Your engineering mathematics textbook has been marked as recovered.',
        type: 'recovery', referenceId: recovered._id,
      });
    }
    console.log(`Seeded ${created.length} sample item reports. Demo student ${student.email}; admin ${admin.email}.`);
  }
  return { student, admin };
}
