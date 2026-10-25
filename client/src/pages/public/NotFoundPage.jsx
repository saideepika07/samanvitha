import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button.jsx';
import { BRAND } from '../../config/brand.js';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-sand-200 text-charcoal-700 flex items-center justify-center mx-auto text-2xl font-serif font-bold">
          404
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-charcoal-900">Page Not Found</h1>
          <p className="text-sm text-charcoal-600">
            The page you are looking for does not exist or may have been relocated in the network.
          </p>
        </div>
        <Link to="/">
          <Button variant="primary" icon={Home} className="px-6 py-2.5">
            Return to {BRAND.name} Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
