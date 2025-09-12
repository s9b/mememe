import React from 'react';
import { GetStaticProps } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { remark } from 'remark';
import html from 'remark-html';
import LegalLayout from '../components/LegalLayout';

interface TermsPageProps {
  contentHtml: string;
}

const TermsPage: React.FC<TermsPageProps> = ({ contentHtml }) => {
  return (
    <LegalLayout
      title="Terms of Service"
      description="Terms of Service for MemeMe - meme generation platform. Learn about our content policies, user responsibilities, and service guidelines."
    >
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </LegalLayout>
  );
};

export const getStaticProps: GetStaticProps = async () => {
  const filePath = path.join(process.cwd(), 'src', 'content', 'legal', 'terms.md');
  const fileContents = await fs.readFile(filePath, 'utf8');

  // Process markdown
  const processedContent = await remark().use(html).process(fileContents);
  const contentHtml = processedContent.toString();

  return {
    props: {
      contentHtml,
    },
  };
};

export default TermsPage;